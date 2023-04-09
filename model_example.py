import numpy as np
import math
import random
from enum import Enum

YEAR = 365.25
DAY = 1.0 / YEAR
rng = np.random.default_rng()

MALE_DIST = [
    556199, 550200, 554289, 554555, 552631, 550195, 547156, 560931,
    563200, 563224, 559176, 553679, 546729, 543589, 549932, 546043,
    531869, 516847, 502187, 469603, 457234, 458782, 458195, 466585,
    466894, 478880, 499952, 494485, 499192, 503553, 509185, 514547,
    518779, 522765, 524642, 525344, 524028, 521013, 504604, 490965,
    470985, 446012, 418694, 392725, 370384, 353289, 340052, 328700,
    316930, 304013, 289265, 273724, 258566, 245052, 233457, 224203,
    216432, 208929, 200901, 192589, 183617, 174159, 164848, 155780,
    146472, 136949, 127381, 117876, 108654, 99880,  91671,  83926,
    76578,  69446,  62413,  55426,  48685,  42274,  36528,  31740,
    27981,  24914,  22216,  19608,  16967,  14268,  11689,  9404,
    7509,   5910,   17220]
FEMALE_DIST = [
    546583, 540070, 542761, 543436, 541679, 539135, 536397, 550108,
    552589, 552977, 549468, 544628, 538484, 536059, 542961, 539811,
    526372, 511457, 497112, 465517, 453715, 454499, 454057, 462111,
    462002, 473948, 495224, 490080, 496446, 501890, 507712, 512689,
    516280, 519075, 519740, 520070, 519042, 514800, 498903, 485707,
    466135, 441880, 416150, 392858, 374232, 361659, 353606, 347796,
    341605, 333841, 323561, 311601, 299187, 288039, 278985, 272570,
    267692, 262837, 256621, 248861, 239132, 228056, 216780, 205881,
    195007, 184279, 173677, 163111, 152615, 142337, 132336, 122614,
    113283, 104226, 95242,  86302,  77627,  69138,  61368,  54957,
    50070,  46156,  42632,  38899,  34836,  30361,  25828,  21628,
    17972,  14930,  51609]

SUM_MALE_AGE = sum(MALE_DIST)
SUM_FEMALE_AGE = sum(FEMALE_DIST)
MALE_PROB = [n/SUM_MALE_AGE for n in MALE_DIST]
FEMALE_PROB = [n/SUM_FEMALE_AGE for n in FEMALE_DIST]
MALE_AGE = [i for i in range(len(MALE_DIST))]
FEMALE_AGE = [i for i in range(len(FEMALE_DIST))]


class Sex(Enum):
    MALE = 0
    FEMALE = 1


class State(Enum):
    SUSCEPTIBLE = 0
    EXPOSED = 1
    INFECTIOUS = 2
    RECOVERED = 3
    VACCINATED = 4
    DEAD = 5
    COUNT = 6


class Agent:
    __id__ = 0

    def __init__(self, state=State.SUSCEPTIBLE, age=None):
        self.id = Agent.__id__
        Agent.__id__ = Agent.__id__ + 1
        print(self.__id__)
        if random.random() < 0.5:
            self.sex = Sex.MALE
        else:
            self.sex = Sex.FEMALE
        if age is None:
            if self.sex == Sex.MALE:
                self.age = rng.choice(MALE_AGE, p=MALE_PROB)
            else:
                self.age = rng.choice(FEMALE_AGE, p=FEMALE_PROB)
        else:
            self.age = age
        self.state = state


class Model:
    def __init__(self, parameters, before_events, during_events, after_events):
        self.parameters = parameters
        self.before_events = before_events
        self.during_events = during_events
        self.after_events = after_events
        self.agents = []
        self.current_time_step = 0
        self.state_counter = {}
        self.birth_tracker = 0.0
        self.deaths_while_infectious = 0

    def run(self):
        for event in self.before_events:
            event(self)
        time_steps = self.parameters['time_steps']
        for i in range(time_steps):
            self.current_time_step += 1
            for event in self.during_events:
                event(self)
        for event in self.after_events:
            event(self)


def event_initialize_agents(model):
    num_susceptible = model.parameters['num_susceptible']
    num_exposed = model.parameters['num_exposed']
    for i in range(num_susceptible + num_exposed):
        if i < num_susceptible:
            state = State.SUSCEPTIBLE
        else:
            state = State.EXPOSED
        model.agents.append(Agent(state))


def event_shuffle_agents(model):
    random.shuffle(model.agents)


def event_increment_age(model):
    for agent in model.agents:
        if agent.state != State.DEAD:
            agent.age += DAY


def event_infect(model):
    num_contacts = model.parameters['num_contacts_avg']
    stdev = model.parameters['num_contacts_stdev']
    risk_exposure = model.parameters['risk_exposure_per_contact']
    alive_indices = [i for i in range(len(model.agents))
                     if model.agents[i] != State.DEAD]

    for i in alive_indices:
        if model.agents[i].state == State.SUSCEPTIBLE:
            num_contacts = max(0, min(len(alive_indices),
                                      rng.normal(num_contacts, stdev)))
            for j in range(num_contacts):
                contact_index = rng.integers(0, len(alive_indices))
                if model.agents[alive_indices[contact_index]].state == \
                   State.INFECTIOUS:
                    if rng.uniform() < risk_exposure:
                        model.agents[i].state = State.EXPOSED
                        break


def change_agent_states(model, from_state, to_state, parameter):
    risk = model.parameters[parameter]
    for agent in model.agents:
        if agent.state == from_state:
            if rng.uniform() < risk:
                agent.state = to_state


def event_exposed_to_infectious(model):
    change_agent_states(model, State.EXPOSED, State.INFECTIOUS,
                        "risk_exposed_infectious")

def event_infectious_to_recovered(model):
    change_agent_states(model, State.INFECTIOUS, State.RECOVERED,
                        "risk_infectious_recovered")


def event_recovered_to_susceptible(model):
    change_agent_states(model, State.RECOVERED, State.SUSCEPTIBLE,
                        "risk_recovered_susceptible")


def event_susceptible_to_vaccinated(model):
    change_agent_states(model, State.SUSCEPTIBLE, State.VACCINATED,
                        "risk_susceptible_vaccinated")


def event_vaccinated_to_susceptible(model):
    change_agent_states(model, State.VACCINATED, State.SUSCEPTIBLE,
                        "risk_vaccinated_susceptible")


def event_births(model):
    birth_rate = model.parameters['birth_rate']
    model.birth_tracker += \
        birth_rate * (len(model.agents) - model.state_counter[State.DEAD])
    for i in range(model.birth_tracker):
        model.agents.append(State.SUSCEPTIBLE, 0.0)

    if model.birth_tracker > 0:
        model.birth_tracker -= math.floor(model.birth_tracker)
