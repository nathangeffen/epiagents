/*
  EpiAgents: simulating infectious diseases.

  Author: Nathan Geffen

  LICENSE

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/*
  There are two classes: EpiAgents and EpiAgentsUI.

  The EpiAgents class is responsible for executing the simulation (or model
  world) that consists of agents moving about in a 2-d plane, knocking into each
  other and, sometimes, becoming infected. The simulation is continuously
  iterated. On each iteration agents may also change states, e.g. recover, get
  vaccinated, isolate etc.

  The EpiAgentUI class is responsible for the browser user interface. It is
  responsible for iteratively drawing the canvas on which the simulation takes
  place, drawing the accompanying chart, providing a form for users to change
  the model parameters, and printing the model output.
 */


"use strict";

(function (EpiAgents) {

    let SimulationStages = {
        SUSCEPTIBLE: {
            description: "susceptible",
            color: "rgb(0, 0, 255)",
            infected: false,
            infectiousness: 0.0,
            initialRatio: 95,
            nextStageProb: {
                VACCINATED: 0.0025
            }
        },
        INFECTED_EXPOSED: {
            description: "exposed",
            color: "rgb(200, 0, 0)",
            infected: true,
            infectiousness: 0.0,
            initialRatio: 3,
            nextStageProb: {
                INFECTED_ASYMPTOMATIC: 0.33
            }
        },
        INFECTED_ASYMPTOMATIC: {
            description: "asymptomatic",
            color: "rgb(210, 0, 0)",
            infected: true,
            infectiousness: 0.1,
            initialRatio: 1,
            nextStageProb: {
                INFECTED_SYMPTOMATIC: 0.33,
                RECOVERED: 0.33
            }
        },
        INFECTED_SYMPTOMATIC: {
            description: "symptomatic",
            color: "rgb(220, 0, 0)",
            infected: true,
            infectiousness: 0.5,
            initialRatio: 1,
            nextStageProb: {
                INFECTED_ISOLATED: 0.1,
                INFECTED_HOSPITAL: 0.1,
                RECOVERED: 0.1
            }
        },
        INFECTED_ISOLATED: {
            description: "symptomatic",
            color: "rgb(225, 0, 0)",
            infected: true,
            infectiousness: 0.001,
            initialRatio: 0,
            nextStageProb: {
                INFECTED_HOSPITAL: 0.1,
                RECOVERED: 0.1
            }
        },
        INFECTED_HOSPITAL: {
            description: "hospitalized",
            color: "rgb(230, 0, 0)",
            infected: true,
            infected: true,
            infectiousness: 0.5,
            initialRatio: 0,
            nextStageProb: {
                INFECTED_ICU: 0.1,
                RECOVERED: 0.1
            }
        },
        INFECTED_ICU: {
            description: "high care",
            color: "rgb(240, 0, 0)",
            infected: true,
            infectiousness: 0.5,
            initialRatio: 0,
            nextStageProb: {
                DEAD: 0.5,
                RECOVERED: 0.1
            }
        },
        TREATED: {
            description: "treated",
            color: "rgb(0, 150, 40)",
            infected: true,
            infectiousness: 0.001,
            initialRatio: 0,
            nextStageProb: {
                DEAD: 0.0001,
                INFECTED_ASYMPTOMATIC: 0.001
            }
        },
        RECOVERED: {
            description: "recovered",
            color: "rgb(0, 150, 0)",
            infected: false,
            infectiousness: 0.0,
            initialRatio: 0,
            nextStageProb: {
                SUSCEPTIBLE: 0.001,
                VACCINATED: 0.001
            }
        },
        VACCINATED: {
            description: "vaccinated",
            color: "rgb(0, 255, 0)",
            infected: false,
            infectiousness: 0.0,
            initialRatio: 0,
            nextStageProb: {
                SUSCEPTIBLE: 0.0005
            }
        },
        DEAD: {
            description: "dead",
            color: "rgb(0, 0, 0)",
            infected: false,
            infectiousness: 0.0,
            initialRatio: 0,
            nextStageProb: {}
        },
    };

    const SimulationState = {
        PAUSED: 0,
        PLAYING: 1
    };
    EpiAgents.SimulationState = SimulationState;

    const EventStage = {
        BEFORE: 0,
        DURING: 1,
        AFTER: 2
    };
    EpiAgents.EventStage = EventStage;



    const DIRECTION = [ [-1, -1], [-1, 0], [-1, 1], [0, -1],
                        [0, 1], [1, -1], [1, 0], [1, 1]];

    function round(value, places=0) {
        let val = value * Math.pow(10, places);
        return Math.round(val) / Math.pow(10, places);
    }

    /* From
       https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
     */
    function gaussian(mean, stdev) {
        var y2;
        var use_last = false;
        return function() {
            var y1;
            if (use_last) {
                y1 = y2;
                use_last = false;
            } else {
                var x1, x2, w;
                do {
        x1 = 2.0 * Math.random() - 1.0;
                    x2 = 2.0 * Math.random() - 1.0;
                    w = x1 * x1 + x2 * x2;
                } while (w >= 1.0);
                w = Math.sqrt((-2.0 * Math.log(w)) / w);
                y1 = x1 * w;
                y2 = x2 * w;
                use_last = true;
            }

            var retval = mean + stdev * y1;
            if (retval > 0)
                return retval;
            return -retval;
        }
    }

    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    function createShuffledIndices(n) {
        let arr = Array.from(new Array(n), (x,i) => i+1);
        for (let i = 0; i < n; i++) arr[i] = i;
        shuffleArray(arr);
        return arr;
    }

    function distanceSquared(x1, x2, y1, y2) {
        let x = (x1 - x2);
        x = x * x;
        let y = y1 - y2;
        y = y * y;
        return x + y;
    }

    function detectCollision(simulation, agent_a, agent_b) {
        if (distanceSquared(agent_a.x, agent_b.x, agent_a.y, agent_b.y) <
            (agent_a.radius + agent_b.radius) *
            (agent_a.radius + agent_b.radius)) {
            ++simulation.collisions;
            return true;
        }

        if (distanceSquared(agent_a.x + agent_a.dx,
                            agent_b.x + agent_b.dx,
                            agent_a.y + agent_a.dy,
                            agent_b.y + agent_b.dy) <
            (agent_a.radius + agent_b.radius) *
            (agent_a.radius + agent_b.radius)) {
            return true;
        }

        return false;
    }

    function makeInfection(from_agent, to_agent, risk) {
        if (Math.random() < risk) {
            to_agent.stage = to_agent.simulation.stages.INFECTED_EXPOSED;
            ++to_agent.simulation.counters.total_simulation_infections;
        }
    }

    function eventMoveAgents(simulation) {
        for (let agent of simulation.agents) {
            if (agent.stage != agent.simulation.stages.DEAD)
                agent.move();
        }
    }

    function advanceStage(agent, stage_from, stage_to, risk) {
        if (agent.stage = stage_from) {
            if (Math.random() < risk) agent.stage = stage_to;
        }
    }

    function eventAdvanceAgents(simulation) {
        for (let agent of simulation.agents) {
            for (const stage in simulation.stages) {
                if (simulation.stages.hasOwnProperty(stage) &&
                    agent.stage === simulation.stages[stage]) {
                    for (const next_stage in
                         simulation.stages[stage].nextStageProb) {
                        const risk = simulation.stages[stage].
                              nextStageProb[next_stage];
                        if (Math.random() < risk) {
                            agent.stage = simulation.stages[next_stage];
                        }
                    }
                }
            }
        }
    }


    function eventCalcResults(simulation) {
        for (const key in simulation.counters) {
            if (key.substr(0, 6) !== "total_")
                simulation.counters[key] = 0;
        }
        for (const agent of simulation.agents) {
            if (! (agent.stage.description in simulation.counters) ) {
                simulation.counters[agent.stage.description] = 1;
            } else {
                ++simulation.counters[agent.stage.description];
            }
            if (agent.stage.infected)
                ++simulation.counters.infections;
            if (agent.stage !== simulation.stages.DEAD)
                ++simulation.counters.alive;
        }
    }

    class Agent {
        constructor(simulation) {
            this.simulation = simulation;
            this.radius = simulation.agentRadius;
            this.id = simulation.agent_counter;
            simulation.agent_counter++;
            this.speed = simulation.agent_speed;
            this.stage = simulation.stages.SUSCEPTIBLE;
            this.x = Math.random() * simulation.width;
            this.y = Math.random() * simulation.height;
            this.movementRandomness = gaussian(
                simulation.movementRandomnessMean,
                simulation.movementRandomnessStdev);
            this.setDirection();
        }

        setDirection() {
            const index = Math.floor(Math.random() * 8.0);
            this.dx = DIRECTION[index][0] * this.speed;
            this.dy = DIRECTION[index][1] * this.speed;
        }

        getInfectiousness() {
            return this.stage.infectiousness;
        }

        infectAgent(agent) {
            let this_infectiousness = this.getInfectiousness();
            let agent_infectiousness = agent.getInfectiousness();
            if (this.stage === this.simulation.stages.SUSCEPTIBLE &&
                agent_infectiousness > 0) {
                makeInfection(agent, this, agent_infectiousness);
            } else if (agent.stage === agent.simulation.stages.SUSCEPTIBLE &&
                       this_infectiousness > 0) {
                makeInfection(this, agent, this_infectiousness);
            }
        }

        detectInfections() {
            for (let agent of this.simulation.agents) {
                if (agent.id !== this.id) {
                    if (detectCollision(this.simulation, this, agent)) {
                        if (this.simulation.elasticCollisions &&
                            this.id < agent.id) {
                            const dx = this.dx;
                            this.dx = agent.dx;
                            agent.dx = dx;
                            const dy = this.dy;
                            this.dy = agent.dy;
                            agent.dy = dy;
                        }
                        this.infectAgent(agent);
                    }
                }
            }
        }

        move() {
            if (this.stage === this.simulation.stages.DEAD) {
                this.x = this.y = -1000;
                return;
            }
            if (Math.random() < this.movement_randomness) {
                this.setDirection();
            }

            if (this.x + this.dx >= this.simulation.width - this.radius ||
                this.x + this.dx <= this.radius) {
                this.dx = -this.dx;
            }
            if (this.y + this.dy >= this.simulation.height - this.radius ||
                this.y + this.dy <= this.radius) {
                this.dy = -this.dy;
            }

            this.detectInfections();

            this.x += this.dx;
            this.y += this.dy;
        }

        squeezeLeft() {
            if (this.x >= this.simulation.width) {
                this.x = this.simulation.width - 1;
            }
        }

    };

    class Simulation {

        constructor(options) {
            this.name = options.name || null;
            this.description = options.description || null;
            this.div = options.div || null;
            this.width = options.width || 790;
            this.height = options.height || 500;
            this.state = SimulationState.PAUSED;
            this.interval = options.interval || 10;
            this.timer = undefined;
            this.numAgents = options.numAgents || 2000;
            this.agentRadius = options.agentRadius || 3;
            this.agentCounter = options.agentCounter || 0;
            this.movementRandomnessMean = options.movementRandomnessMean || 0.1;
            this.movementRandomnessStdev = options.movementRandomnessStdev || 0.0;
            this.elasticCollisions = false || options.elasticCollisions;
            this.agent_speed = options.agent_speed || 1.0;
            this.agents = [];

            // Events
            this.extra_before_events = options.extra_before_events || [];
            this.extra_during_events = options.extra_during_events || [];
            this.extra_after_events = options.extra_after_events || [];

            this.before_events = options.before_events ||
                [].concat(this.extra_before_events);
            this.during_events = options.during_events ||
                [eventAdvanceAgents, eventMoveAgents, eventCalcResults].
                concat(this.extra_during_events) || options.during_events;
            this.after_events = options.after_events ||
                [eventCalcResults].concat(this.extra_after_events);

            this.initial_exposed = 10 || options.initial_exposed;
            this.iteration = 0;
            this.max_iterations = options.max_iterations || 0;
            this.stages = JSON.parse(JSON.stringify(SimulationStages))
                || options.simulationStages;

            this.asymptomatic_infectiousness  = 0.1 ||
                options.asymptomatic_infectiousness;
            this.symptomatic_infectiousness  = 0.5 ||
                options.symptomatic_infectiousness;
            this.hospital_infectiousness = 0.5 ||
                options.hospital_infectiousness;
            this.icu_infectiousness = 0.5 ||
                options.icu_infectiousness;
            this.counters = {
                alive: 0,
                infections: 0,
                total_initial_infections: 0,
                total_simulation_infections: 0
            };
        }

        setInitialRatio(stage, val) {
            if (stage in this.stages) {
                this.stages[stage].initialRatio = val;
            } else {
                throw "Error in setInitialRatio. Unknown stage: " + stage;
            }
        }

        setInitialRatios(arr) {
            for (const parms of arr) {
                this.setInitialRatio(parms[0], parms[1]);
            }
        }

        clearInitialRatio(stage) {
            this.setInitialRatio(stage, 0);
        }

        clearAllInitialRatios() {
            for (let stage in this.stages)
                this.clearInitialRatio(stage);
        }

        setInfectiousness(stage, val) {
            if (stage in this.stages) {
                this.stages[stage].infectiousness = val;
            } else {
                throw "Error in setInfectiousness. Unknown stage: " + stage;
            }
        }
        setInfectiousnesses(arr) {
            for (const parms of arr) {
                this.setInfectiousness(parms[0], parms[1]);
            }
        }

        clearInfectiousness(stage) {
            this.setInfectiousness(stage, 0.0);
        }

        clearAllInfectiousness(stage) {
            for (let stage in this.stages)
                this.clearInfectiousness(stage);
        }

        setTransition(from_stage, to_stage, val) {
            if (!from_stage in this.stages) {
                throw "Error in setTransitions. Unknown from stage: " + from_stage;
            }
            if (!to_stage in this.stages) {
                throw "Error in setTransitions. Unknown to stage: " + to_stage;
            }
            this.stages[from_stage].nextStageProb[to_stage] = val;
        }

        setTransitions(arr) {
            for (const parms of arr) {
                this.setTransition(parms[0], parms[1], parms[2]);
            }
        }

        clearTransitions(stage) {
            this.stages[stage].nextStageProb = {};
        }

        clearAllTransitions() {
            for (let stage in this.stages)
                this.clearTransitions(stage);
        }

        clear() {
            this.clearAllTransitions();
            this.clearAllInfectiousness();
            this.clearAllInitialRatios();
        }

        runEvents(events) {
            for (let event of events) event(this);
        }

        beforeIteration() {
            this.event_stage = EventStage.BEFORE;
            this.runEvents(this.before_events);
        };

        oneIteration() {
            this.event_stage = EventStage.DURING;
            this.runEvents(this.during_events);
            ++this.iteration;
            if (this.max_iterations > 0 &&
                this.iteration % this.max_iterations === 0) {
                this.stop();
            }
        }

        afterIteration() {
            this.event_stage = EventStage.AFTER;
            this.runEvents(this.after_events);
        };

        step() {
            if (this.state != SimulationState.PLAYING) {
                if (this.iteration === 0)
                    this.beforeIteration();
                this.oneIteration();
            }
        }

        play() {
            if (this.state != SimulationState.PLAYING) {
                this.state = SimulationState.PLAYING;
                let simulation = this;
                if (this.iteration === 0)
                    this.beforeIteration();
                this.timer = setInterval(function() {
                    simulation.oneIteration();
                }, this.interval);
            }
        }

        pause() {
            if (this.state != SimulationState.PAUSED) {
                this.state = SimulationState.PAUSED;
                clearInterval(this.timer);
                this.timer = undefined;
            }
        }

        stop() {
            this.pause();
            this.afterIteration();
        }

        generateAgents(numAgents) {
            for (let i = 0; i < numAgents; i++) {
                this.agents.push(new Agent(this));
            }
        }

        calcInitialRatios() {
            let total = 0.0;
            for (const stage in this.stages) {
                total += this.stages[stage].initialRatio;
            }
            let cumulative = 0.0;
            for (let stage in this.stages) {
                let r = this.stages[stage].initialRatio / total + cumulative;
                this.stages[stage]["initial_proportion"] = r;
                cumulative = r;
            }
        }

        calcInitialStages() {
            for (let agent of this.agents) {
                let r = Math.random();
                for (const stage in this.stages) {
                    if (r < this.stages[stage].initial_proportion) {
                        agent.stage = this.stages[stage];
                        if (stage.substr(0, 8) === "INFECTED")
                            ++this.counters.total_initial_infections;
                        break;
                    }
                }
            }
        }

        createAgents() {
            this.agents = [];
            this.generateAgents(this.numAgents);
        }

        initialize() {
            this.createAgents();
            this.calcInitialRatios();
            this.calcInitialStages();
            eventCalcResults(this);
        }

    }

    EpiAgents.save = function(sim) {
        const obj =  JSON.stringify(sim);
        console.log(obj);
    }

    EpiAgents.create = function(div, options={}) {
        let simulation = new Simulation(options);
        simulation.div = div;
        return simulation;
    }

} (window.EpiAgents = window.EpiAgents || {}));



(function (EpiAgentsUI) {

    const INF = "epi-infectiousness-";
    const TRANS = "epi-transition-";
    const INF_SLIDER = INF + "slider-"
    const TRANS_SLIDER = TRANS + "slider-";
    EpiAgentsUI.default_options = {
        chart_options: {
            animation: false,
            aspectRatio: 790.0 / 500.0
        }
    };

    let ui_elements = {};

    function createSimulationCanvas(div_id, simulation) {
        if (simulation.canvas === null) {
            simulation.canvas = document.createElement("canvas");
            simulation.canvas.classList.add("epi-game-canvas");
            simulation.canvas.id = div_id + '-canvas';
            simulation.div.appendChild(simulation.canvas);
            simulation.canvas.width = simulation.width;
            simulation.canvas.height = simulation.height;
            simulation.ctx = simulation.canvas.getContext("2d");
        }
    }

    function eventDrawCanvas(simulation) {
        simulation.ctx.clearRect(0, 0, simulation.width, simulation.height);
        for (let agent of simulation.agents) {
            drawAgent(agent);
        }
    }

    function drawAgent(agent) {
        if (agent.stage !== agent.simulation.stages.DEAD) {
            let ctx = agent.simulation.ctx;
            ctx.beginPath();
            ctx.arc(agent.x, agent.y, agent.radius, 0, Math.PI*2);
            ctx.fillStyle = agent.stage.color;
                ctx.fill();
            ctx.closePath();
        }
    }

    function createGraph(elem, simulation) {
        const labels = [
            [simulation.iteration]
        ];
        const data = {
            labels: labels,
            datasets: [
                {
                    label: 'Total infections',
                    backgroundColor: 'rgb(255, 99, 132)',
                    borderColor: 'rgb(255, 99, 132)',
                    data: [simulation.counters.total_initial_infections +
                           simulation.counters.total_simulation_infections],
                },
                {
                    label: 'Current infections',
                    backgroundColor: 'rgb( 99, 255, 132)',
                    borderColor: 'rgb(99, 255, 132)',
                    data: [simulation.counters.infections],
                }
            ]
        };
        const config = {
            type: 'line',
            data,
            options: simulation.chart_options
        };
        let chart = new Chart(elem, config);
        return chart;
    }

    function updateGraph(simulation, chart) {
        chart.data.labels.push(simulation.iteration);
        chart.data.datasets[0].data.push(
            simulation.counters.total_initial_infections +
                simulation.counters.total_simulation_infections);
        chart.data.datasets[1].data.push(simulation.counters.infections);
        chart.update();
    }

    function writeResults(div, simulation) {
        let text = "";
        if (simulation.event_stage === EpiAgents.EventStage.DURING) {
            text += "<p class='epi-iteration-head'>Iteration: " +
                simulation.iteration + "<p></p>";
        } else if (simulation.event_stage === EpiAgents.EventStage.BEFORE) {
            text += "<p class='epi-iteration-head'>At start</p><p>";
        } else if (simulation.event_stage === EpiAgents.EventStage.AFTER) {
            text += "<p class='epi-iteration-head'>At end</p><p>";
        } else {
            text += "<p class='epi-iteration-head'>Simulation status</p><p>";
        }
        for (let stat in simulation.counters)
            text += stat + ": " + simulation.counters[stat] + "<br/>";
        text += "</p>"
        div.insertAdjacentHTML('afterbegin', text);
    }

    function createUIElements(div_id) {
        let div = document.getElementById(div_id);

        let simulation =  document.createElement("div");
        simulation.classList.add('epi-game');
        let sim_min_max = document.createElement("button");
        sim_min_max.classList.add("epi-min-max");
        sim_min_max.textContent = "x";
        simulation.append(sim_min_max);
        div.append(simulation);

        let chart_holder  = document.createElement("div");
        let chart = document.createElement("canvas");
        let chart_min_max = document.createElement("button");
        chart_holder.classList.add('epi-chart-holder');
        chart.classList.add('epi-chart');
        chart_min_max.classList.add("epi-min-max");
        chart_min_max.textContent = "x";
        div.append(chart_holder);
        chart_holder.append(chart_min_max);
        chart_holder.append(chart);

        let parameterBox = document.createElement("div");
        parameterBox.classList.add('epi-parameter-box');
        let parameter_min_max = document.createElement("button");
        parameter_min_max.classList.add("epi-min-max");
        parameter_min_max.textContent = "x";
        parameterBox.append(parameter_min_max);
        div.append(parameterBox);

        let parameters = document.createElement("div");
        parameters.classList.add('epi-parameters');
        parameterBox.append(parameters);

        let showZeros = document.createElement("div");
        showZeros.classList.add('epi-show-zeros');
        parameterBox.append(showZeros);

        let results_box = document.createElement("div");
        results_box.classList.add("epi-results-box");
        let results_min_max = document.createElement("button");
        results_min_max.classList.add("epi-min-max");
        results_min_max.textContent = "x";
        results_box.append(results_min_max);
        let results = document.createElement("div");
        results.classList.add('epi-results');
        results_box.append(results);
        div.append(results_box);

        let controls = document.createElement("div");
        controls.classList.add('epi-controls');
        div.append(controls);

        let play = document.createElement("button");
        play.textContent = "Play";
        play.classList.add('epi-button');
        controls.append(play);

        let step = document.createElement("button");
        step.textContent = "Step";
        step.classList.add('epi-button');
        controls.append(step);

        // let save = document.createElement("button");
        // save.textContent = "Save";
        // save.classList.add('epi-button');
        // div.append(save);

        ui_elements[div_id] = {
            'simulation': simulation,
            'chart': chart,
            'parameterBox': parameterBox,
            'parameters': parameters,
            'results': results,
            'showZeros': showZeros,
            'play': play,
            'step': step,
            //   'save': save
        };
    }


    function changeParameter(sim, elem) {
        let id = elem.id;
        const l_i = sim.inf_slider.length;
        const l_t = sim.trans_slider.length;
        if (id.substr(0, l_i) === sim.inf_slider) {
            const stage = id.substr(l_i);
            sim.stages[stage].infectiousness = elem.value;
            document.getElementById(sim.div_id + INF + stage).textContent =
                Number(elem.value).toFixed(2);
        } else if (id.substr(0, l_t) === sim.trans_slider) {
            const transition = id.substr(l_t);
            const stages = transition.split("-");
            const stage_from = stages[0];
            const stage_to = stages[1];
            sim.stages[stage_from].nextStageProb[stage_to] = elem.value;
            document.getElementById(sim.trans + stage_from + '-' + stage_to).
                textContent = Number(elem.value).toFixed(2);
        }
    }

    function showParameters(sim, elem) {
        let infectious_ids = [];
        let transition_ids = [];
        let output = "";
        if (sim.name)
            output += "<h2 class='epi-model-name'>" +
            sim.name + "</h2>";
        if (sim.description)
            output += "<p class='epi-model-description'>" +
            sim.description +
            "<p>";
        output +=
            "<p>" + "Number of agents: " + sim.numAgents + "</p>";

        output +=
            "<span class='epi-entry'>" +
            "<span class='epi-description'>speed (millisecs)</span>" +
            "<span id='" + sim.div_id + "-speed' class='epi-value'>" +
            sim.interval + "</span> <input id='" + sim.div_id + "-speed-slider'" +
            "type='range' min=0 max=2000 step='1' class='epi-slider' " +
            "value=" + sim.interval + " ></span>";

        output +=
            "<span class='epi-entry'>" +
            "<span class='epi-description'>width</span>" +
            "<span id='" + sim.div_id + "-width' class='epi-value'>" +
            sim.width + "</span> <input id='" + sim.div_id + "-width-slider'" +
            "type='range' min=100 max=2000 step='10' class='epi-slider' " +
            "value=" + sim.width + " ></span>";


        // Infectiousness
        output += "<h2 class='epi-model-infectiousness'>Infectiousness</h2>";
        const stages = sim.stages;
        for (const stage in stages) {
            let id = sim.inf_slider + stage;
            output +=
                "<span class='epi-entry'>" +
                "<span class='epi-description'>" +
                stages[stage].description +
                "</span><span id='" + sim.div_id + INF + stage + "' " +
                "class='epi-value' >" +
                stages[stage].infectiousness.toFixed(2) +
                "</span>" +
                "<input id='" + id + "' " +
                "type='range' min='0' max='1.0' step='0.01' value='" +
                stages[stage].infectiousness.toFixed(2) +
                "' class='epi-slider'></span>";
            infectious_ids.push(id);
        }

        // Transitions
        output+= "<h2 class='epi-model-transitions'>Transitions</h2><p>"
        for (const from_stage in stages) {
            for (const to_stage in stages[from_stage].nextStageProb) {
                let id = sim.trans_slider + from_stage + "-" + to_stage;
                    output +=
                    "<span class='epi-entry'>" +
                    "<span class='epi-description'>" +
                    stages[from_stage].description + " - " +
                    stages[to_stage].description +
                    "</span><span id='" + sim.trans + from_stage + "-" + to_stage +
                    "' " + "class='epi-value' >" +
                    Number(stages[from_stage].nextStageProb[to_stage]).
                    toFixed(2) +
                    "</span>" +
                    "<input id='" + id + "' " +
                    "type=range min='0' max='1.0' step='0.01' " +
                    "value='" +
                    Number(stages[from_stage].nextStageProb[to_stage]).
                    toFixed(2) +
                    "' class='epi-slider'>" +
                    "</span>"
                transition_ids.push(id);
            }
        }
        output += "</p>"

        elem.innerHTML = output;
        const widgets = {
            "infectious_ids": infectious_ids,
            "transition_ids": transition_ids
        };
        return widgets;
    }

    function setupShowZeros(div_id, sim) {
        let output = '';
        output += '<label for="epi-show-zeros">Show zeros</label>';
        output +=
            '<input type="checkbox" id="epi-show-zeros-checkbox" ' +
            'name="epi-show-zeros"';
        if (sim.show_zeros) {
            output += 'checked >';
        } else {
            output += '></div>';
        }
        ui_elements[div_id].showZeros.innerHTML = output;
        document.getElementById('epi-show-zeros-checkbox').addEventListener(
            "change", function (e) {
                if (e.target.checked)
                    sim.show_zeros = true;
                else
                    sim.show_zeros = false;
                let elems = ui_elements[div_id].parameterBox.
                    getElementsByClassName("epi-entry");
                for (let elem of elems) {
                    let slider = elem.getElementsByClassName("epi-slider")[0];
                    if (Number(slider.value) === 0) {
                        if (sim.show_zeros)
                            elem.classList.remove("epi-hidden")
                        else
                            elem.classList.add("epi-hidden");
                    }
                }
            });
    }

    function getAllSiblings(elem) {
        let sibs = [];
        while (elem = elem.nextSibling) {
            sibs.push(elem);
        };
        return sibs;
    }

    function assignEvents(div_id, sim) {
        let play = ui_elements[div_id].play;
        let step = ui_elements[div_id].step;
        //let save = ui_elements[div_id].save;
        play.addEventListener("click", function (e) {
            if (sim.state == EpiAgents.SimulationState.PAUSED) {
                e.target.textContent = "Pause";
                step.disabled = true;
                sim.play();
            } else {
                e.target.textContent = "Play";
                step.disabled = false;
                sim.pause();
            }
        });
        step.addEventListener("click", function (e) {
            if (sim.state == EpiAgents.SimulationState.PAUSED) {
                let t = sim.max_iterations;
                sim.step();
            }
        });
        //save.addEventListener("click", function(e) {
        //    EpiAgents.save(sim);
        //});
        let widgets = showParameters(sim, ui_elements[div_id].parameters);
        setupShowZeros(div_id, sim);

        document.getElementById(div_id + '-speed-slider').
            addEventListener("input", function(e) {
                sim.interval = e.target.value;
                document.getElementById(div_id + '-speed').textContent =
                    e.target.value;
                if (sim.state === EpiAgents.SimulationState.PLAYING) {
                    sim.pause();
                    sim.play();
                }
            });

        document.getElementById(div_id + '-width-slider').
            addEventListener("input", function(e) {
                sim.width = e.target.value;
                document.getElementById(div_id + '-width').textContent =
                    e.target.value;
                sim.canvas.width = sim.width;
                for (let agent of sim.agents) {
                    agent.squeezeLeft();
                }
                eventDrawCanvas(sim);
            });

        for (let id of widgets["infectious_ids"]) {
            document.getElementById(id).addEventListener(
                "input", function (e) {
                    changeParameter(sim, e.target); });
        }
        for (let id of widgets["transition_ids"]) {
            document.getElementById(id).addEventListener(
                "input", function (e) {
                    changeParameter(sim, e.target);
                });
        }

        let elems = document.getElementById(div_id).
            getElementsByClassName("epi-min-max");
        for (let elem of elems) {
            elem.addEventListener("click", function() {
                if (elem.textContent === "x") {
                    elem.textContent = "+";
                    for (let sib of getAllSiblings(elem)) {
                        sib.style.display = "none";
                    }
                } else {
                    elem.textContent = "x";
                    for (let sib of getAllSiblings(elem)) {
                        sib.style.display = "inherit";
                    }
                }
            });
        }

    }


    EpiAgentsUI.create = function(div_id, options={}) {
        createUIElements(div_id);
        let chart = {};
        let override_options = options;
        override_options.extra_before_events = options.extra_before_events ||
            [eventDrawCanvas];
        override_options.extra_during_events = options.extra_during_events ||
            [
                eventDrawCanvas,
                function(simulation) {
                    writeResults(ui_elements[div_id].results, simulation);
                    updateGraph(simulation, chart);
                }
            ];
        override_options.extra_after_events = options.extra_after_events ||
            [eventDrawCanvas];

        let sim = EpiAgents.create(ui_elements[div_id].simulation,
                                   override_options);
        sim.canvas = options.canvas || null;
        sim.ctx = null;
        sim.div_id = div_id;
        sim.inf = INF + div_id;
        sim.inf_slider = sim.inf + "-";
        sim.trans = TRANS + div_id;
        sim.trans_slider = sim.trans + "-";
        sim.init = function() {
            sim.initialize();
            createSimulationCanvas(div_id, sim);
            eventDrawCanvas(sim);
            assignEvents(div_id, sim);
            writeResults(ui_elements[div_id].results, sim);
        }
        sim.show_zeros = true;

        sim.chart_options = override_options.chart_options ||
            EpiAgentsUI.default_options.chart_options;
        chart = createGraph(ui_elements[div_id].chart, sim);

        if (options.auto_play) {
            sim.init();
            sim.play();
        } else if (options.init) {
            sim.init();
        }

        return sim;
    }

} (window.EpiAgentsUI = window.EpiAgentsUI || {}));
