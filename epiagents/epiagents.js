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
            description: "isolated",
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

    function deepCopy(aObject) {
        if (!aObject) {
            return aObject;
        }
        let v;
        let bObject = Array.isArray(aObject) ? [] : {};
        for (const k in aObject) {
            v = aObject[k];
            bObject[k] = (typeof v === "object") ? deepCopy(v) : v;
        }
        return bObject;
    }

    EpiAgents.deepCopy = deepCopy;

    function objToString(obj, indent=0) {
        let str;
        let t = typeof(obj);
        let delim = "    ";
        let spaces = "";
        let functionSpaces = "";
        for (let i = 0; i < indent; i++) {
            spaces += delim;
        }
        for (let i = 0; i < indent - 1; i++) {
            functionSpaces += delim;
        }

        if (t === "undefined") {
            str = "";
        } else if (t === "number") {
            str = obj.toString();
        } else if (t === "function") {
            str = obj.toString();

            // A valiant but not very good attempt to format functions nicely
            let lines = str.split("\n");
            for (let i = 1; i < lines.length; i++) {
                 lines[i] = functionSpaces + lines[i];
            }
            str = "";
            for (let i = 0; i < lines.length; i++) {
                str += lines[i] + "\n";
            }
            str = str.slice(0, -1); // Get rid of last "\n"

        } else if (t === "object") {
            if (Array.isArray(obj)) {
                str = "[\n";
                for (let elem of obj) {
                    str += spaces + delim + objToString(elem, indent + 1) + ",\n";
                }
                str += spaces + "]";
            } else {
                str = "{\n";
                for (let elem in obj) {
                    str += spaces + delim + elem + ": " +
                        objToString(obj[elem], indent + 1) + ",\n";
                }
                str += spaces + "}";
            }
        } else {
            str = '"' + obj.toString() + '"';
        }
        return str;
    }

    EpiAgents.objToString = objToString;

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

    function detectCollision(sim, agent_a, agent_b) {
        if (distanceSquared(agent_a.x, agent_b.x, agent_a.y, agent_b.y) <
            (agent_a.radius + agent_b.radius) *
            (agent_a.radius + agent_b.radius)) {
            ++sim.collisions;
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
            to_agent.stage = to_agent.sim.stages.INFECTED_EXPOSED;
            ++to_agent.sim.counters.total_simulation_infections.num;
        }
    }

    function eventMoveAgents(sim) {
        for (let agent of sim.agents) {
            if (agent.stage != agent.sim.stages.DEAD)
                agent.move();
        }
    }

    function eventAdvanceAgents(sim) {
        for (let agent of sim.agents) {
            for (const stage in sim.stages) {
                if (sim.stages.hasOwnProperty(stage) &&
                    agent.stage === sim.stages[stage]) {
                    for (const next_stage in
                         sim.stages[stage].nextStageProb) {
                        const risk = sim.stages[stage].
                              nextStageProb[next_stage];
                        if (Math.random() < risk) {
                            agent.stage = sim.stages[next_stage];
                            break;
                        }
                    }
                }
            }
        }
    }

    function eventCalcResults(sim) {
        for (const key in sim.counters) {
            if (key.substr(0, 6) !== "total_")
                sim.counters[key].num = 0;
        }
        for (const agent of sim.agents) {
            if (agent.stage.description in sim.counters) {
                ++sim.counters[agent.stage.description].num;
            }
            if (agent.stage.infected)
                ++sim.counters.infections.num;
            if (agent.stage !== sim.stages.DEAD)
                ++sim.counters.alive.num;
        }
    }

    EpiAgents.eventCalcResults = eventCalcResults;

    function eventRecordResultHeader(sim) {
        let header = ["#",];
        for (let key in sim.counters) header.push(key);
        sim.results.push(header);
    }

    EpiAgents.eventRecordResultHeader = eventRecordResultHeader;

    function eventRecordResult(sim) {
        let result = [];
        if (sim.event_stage === EpiAgents.EventStage.DURING) {
            result.push(sim.iteration);
        } else if (sim.event_stage === EpiAgents.EventStage.BEFORE) {
            result.push("S");
        } else if (sim.event_stage === EpiAgents.EventStage.AFTER) {
            result.push("E");
        }
        for (let key in sim.counters)
            result.push(sim.counters[key].num);
        sim.results.push(result);
    }

    function ifElse(x, y) {
        if (x !== undefined)
            return x;
        return y;
    }

    EpiAgents.eventRecordResult = eventRecordResult;

    class Agent {
        constructor(sim) {
            this.sim = sim;
            this.radius = sim.config.agentRadius;
            this.id = sim.agentCounter;
            sim.agentCounter++;
            this.speed = sim.config.agentSpeed;
            this.stage = sim.stages.SUSCEPTIBLE;
            this.stages = [ [0, sim.stages.SUSCEPTIBLE] ];
            const index = Math.floor(Math.random() * sim.clusters.length);
            this.cluster = sim.clusters[index];
            this.x = Math.random() * (this.cluster.right - this.cluster.left) +
                this.cluster.left;
            this.y = Math.random() * (this.cluster.bottom - this.cluster.top) +
                this.cluster.top;
            this.correctPosition();
            this.movementRandomness = gaussian(
                sim.config.movementRandomnessMean,
                sim.config.movementRandomnessStdev);
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
            if (this.stage === this.sim.stages.SUSCEPTIBLE &&
                agent_infectiousness > 0) {
                makeInfection(agent, this, agent_infectiousness);
            } else if (agent.stage === agent.sim.stages.SUSCEPTIBLE &&
                       this_infectiousness > 0) {
                makeInfection(this, agent, this_infectiousness);
            }
        }

        detectInfections() {
            for (let agent of this.sim.agents) {
                if (agent.id !== this.id) {
                    if (detectCollision(this.sim, this, agent)) {
                        if (this.sim.config.elasticCollisions &&
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

        correctPosition() {
            if (this.x - this.radius < this.cluster.left)
                this.x = this.cluster.left + this.radius;
            else if (this.x + this.radius > this.cluster.right)
                this.x = this.cluster.right - this.radius;
            if (this.y - this.radius < this.cluster.top)
                this.y = this.cluster.top + this.radius;
            else if (this.y + this.radius > this.cluster.bottom)
                this.y = this.cluster.bottom - this.radius;
        }

        move() {
            if (this.stage === this.sim.stages.DEAD) {
                this.x = this.y = -1000;
                return;
            }
            if (Math.random() < this.movement_randomness) {
                this.setDirection();
            }

            if (this.x + this.dx >= this.cluster.right - this.radius ||
                this.x + this.dx <= this.cluster.left + this.radius) {
                this.dx = -this.dx;
            }
            if (this.y + this.dy >= this.cluster.bottom - this.radius ||
                this.y + this.dy <= this.cluster.top + this.radius) {
                this.dy = -this.dy;
            }

            this.detectInfections();

            this.x += this.dx;
            this.y += this.dy;
            this.correctPosition();
        }
    };

    class Simulation {

        processOptions(options) {
            // Simulation parameters
            this.config = {};
            let config = this.config;
            config.name = options.name || null;
            config.description = options.description || null;
            config.width = options.width || 320;
            config.height = options.height || 320;
            config.maxArea = options.maxArea || config.width * config.height;
            config.interval = options.interval || 0;
            config.numAgents = options.numAgents || 1000;
            config.agentRadius = options.agentRadius || 3;
            config.movementRandomnessMean = options.movementRandomnessMean || 0.0;
            config.movementRandomnessStdev = options.movementRandomnessStdev || 0.0;
            config.elasticCollisions = options.elasticCollisions || true;
            config.agentSpeed = ifElse(options.agents_speed, 1.0);
            config.extraBeforeEvents = options.extraBeforeEvents || [];
            config.extraDuringEvents = options.extraDuringEvents || [];
            config.extra_after_events = options.extraAfterEvents || [];
            config.before_events = options.before_events ||
                [].concat(config.extraBeforeEvents);
            config.during_events = options.during_events ||
                [eventAdvanceAgents, eventMoveAgents, eventCalcResults,
                 eventRecordResult].
                concat(config.extraDuringEvents) || options.during_events;
            config.after_events = options.after_events ||
                [eventCalcResults, eventRecordResult].
                concat(config.extraAfterEvents);
            config.max_iterations = options.max_iterations || 0;
            config.stages = options.simulationStages || deepCopy(SimulationStages);
            config.clusters = options.clusters || [
                {
                    left: 0,
                    top: 0,
                    right: config.width,
                    bottom: config.height,
                    border: true,
                    borderColor: "black"
                },
            ];

            this.clusters = deepCopy(config.clusters);
            this.state = SimulationState.PAUSED;
            this.timer = undefined;
            this.agentCounter = options.agentCounter || 0;
            this.agents = [];
            this.stages = config.stages // Convenience because stages used so often

            this.user_counters = {};
            for (let stage in SimulationStages) {
                const description = SimulationStages[stage].description;
                this.user_counters[description] = {
                    num: 0,
                    print: false,
                }
            }
            this.user_counters["susceptible"].print = true;
            this.user_counters["recovered"].print = true;
            this.compulsory_counters = {
                alive: {
                    print: true,
                    num: 0
                },
                total_initial_infections: {
                    print: false,
                    num: 0
                },
                total_simulation_infections: {
                    print: true,
                    num: 0
                },
                infections: {
                    print: true,
                    num: 0
                }
            };
            this.counters = {
                ...this.compulsory_counters,
                ...this.user_counters
            };
            this.event_stage = options.event_stage || EventStage.BEFORE;
            this.results = [];
            this.iteration = 0;
        }

        constructor(options) {
            this.processOptions(options);
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
            this.runEvents(this.config.before_events);
        };

        oneIteration() {
            this.event_stage = EventStage.DURING;
            this.runEvents(this.config.during_events);
            ++this.iteration;
            if (this.config.max_iterations > 0 &&
                this.iteration % this.config.max_iterations === 0) {
                this.stop();
            }
        }

        afterIteration() {
            this.event_stage = EventStage.AFTER;
            this.runEvents(this.config.after_events);
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
                let sim = this;
                if (this.iteration === 0)
                    this.beforeIteration();
                this.timer = setInterval(function() {
                    sim.oneIteration();
                }, this.config.interval);
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
            this.config.numAgents = this.agents.length;
        }

        calcInitialRatios() {
            let total = 0.0;
            for (const stage in this.stages) {
                total += parseFloat(this.stages[stage].initialRatio);
            }
            let cumulative = 0.0;
            for (let stage in this.stages) {
                let r = this.stages[stage].initialRatio / total;
                this.stages[stage]["initial_proportion"] = cumulative + r;
                cumulative += r;
            }
        }

        calcInitialStages(from = 0, to) {
            if (to === undefined) {
                to = this.agents.length;
            }
            for (let i = from; i < to; i++) {
                let agent = this.agents[i];
                let r = Math.random();
                for (const stage in this.stages) {
                    if (r < this.stages[stage].initial_proportion) {
                        agent.stage = this.stages[stage];
                        if (stage.substr(0, 8) === "INFECTED")
                            ++this.counters.total_initial_infections.num;
                        break;
                    }
                }
            }
        }

        createAgents() {
            this.agents = [];
            this.generateAgents(this.config.numAgents);
        }

        removeAgents(n) {
            for (let i = 0; i < n; i++) {
                this.agents.pop();
            }
            this.config.numAgents = this.agents.length;
        }

        initialize() {
            this.createAgents();
            this.calcInitialRatios();
            this.calcInitialStages();
            eventCalcResults(this);
        }

    }

    EpiAgents.create = function(options={}) {
        let sim = new Simulation(options);
        return sim;
    }

    EpiAgents.Simulation = Simulation;

} (window.EpiAgents = window.EpiAgents || {}));



(function (EpiAgentsUI) {

    const INI = "epi-initial-ratio-";
    const INF = "epi-infectiousness-";
    const INI_SLIDER = INI + "slider-"
    const INF_SLIDER = INF + "slider-"
    EpiAgentsUI.default_options = {
        chart_options: {
            animation: false,
            aspectRatio: 790.0 / 500.0
        }
    };

    let ui_elements = {};

    EpiAgentsUI.ui_elements = ui_elements;

    function correctDimensions(div_id, sim)
    {
        let cs = getComputedStyle(sim.sim_div);
        let paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        let borderX = parseFloat(cs.borderLeftWidth) +
            parseFloat(cs.borderRightWidth);
        let elementWidth = sim.sim_div.offsetWidth - paddingX - borderX;
        let elementHeight = elementWidth;
        sim.config.width = Math.min(sim.config.width, elementWidth);
        sim.config.height = Math.min(sim.config.height, elementHeight);
        sim.config.maxArea = sim.config.width * sim.config.height;
        for (let cluster of sim.clusters) {
            if (cluster.bottom > sim.config.height)
                cluster.bottom = sim.config.height;
            if (cluster.right > sim.config.width)
                cluster.right = sim.config.width;
        }
    }

    function createSimulationCanvas(div_id, sim)
    {
        sim.canvas = document.createElement("canvas");
        sim.canvas.classList.add("epi-game-canvas");
        sim.canvas.id = div_id + '-canvas';
        sim.sim_div.appendChild(sim.canvas);
        sim.canvas.width = sim.config.width;
        sim.canvas.height = sim.config.height;
        sim.ctx = sim.canvas.getContext("2d");
        const sim_div = ui_elements[div_id].sim_div;
        const div_width = sim_div.clientWidth;
        const div_height = sim_div.clientHeight;
    }

    function drawAgent(agent)
    {
        if (agent.stage !== agent.sim.stages.DEAD) {
            let ctx = agent.sim.ctx;
            ctx.beginPath();
            ctx.arc(agent.x, agent.y, agent.radius, 0, Math.PI*2);
            ctx.fillStyle = agent.stage.color;
                ctx.fill();
            ctx.closePath();
        }
    }

    EpiAgentsUI.drawAgent = drawAgent;

    function drawCluster(ctx, cluster)
    {
        if (cluster.border) {
            ctx.beginPath();
            ctx.strokeStyle = cluster.borderColor;
            ctx.fillStyle = "red";
            ctx.rect(cluster.left, cluster.top,
                     cluster.right - cluster.left,
                     cluster.bottom - cluster.top);
            ctx.stroke();
        }
    }

    EpiAgentsUI.drawCluster = drawCluster;

    function eventDrawCanvas(sim)
    {
        sim.ctx.clearRect(0, 0, sim.config.width, sim.config.height);
        for (let cluster of sim.clusters) {
            EpiAgentsUI.drawCluster(sim.ctx, cluster);
        }
        for (let agent of sim.agents) {
            EpiAgentsUI.drawAgent(agent);
        }
    }

    function createGraph(elem, sim)
    {
        const labels = [
            [sim.iteration]
        ];
        const data = {
            labels: labels,
            datasets: [
                {
                    label: sim.stages.SUSCEPTIBLE.description,
                    backgroundColor: sim.stages.SUSCEPTIBLE.color,
                    borderColor: sim.stages.SUSCEPTIBLE.color,
                    data: [sim.counters.susceptible.num],
                },
                {
                    label: 'infected',
                    backgroundColor: sim.stages.INFECTED_SYMPTOMATIC.color,
                    borderColor: sim.stages.INFECTED_SYMPTOMATIC.color,
                    data: [sim.counters.infections.num],
                },
                {
                    label: sim.stages.RECOVERED.description,
                    backgroundColor: sim.stages.RECOVERED.color,
                    borderColor: sim.stages.RECOVERED.color,
                    data: [sim.counters.recovered.num],
                }
            ]
        };
        const config = {
            type: 'line',
            data,
            options: sim.chart_options
        };
        let chart = new Chart(elem, config);
        return chart;
    }

    function updateGraph(sim)
    {
        let chart = sim.chart;
        chart.data.labels.push(sim.iteration);
        chart.data.datasets[0].data.push(sim.counters.susceptible.num);
        chart.data.datasets[1].data.push(sim.counters.infections.num);
        chart.data.datasets[2].data.push(sim.counters.recovered.num);
        chart.update();
    }

    function writeResultsHeader(div, sim)
    {
        let table = div.getElementsByTagName("table")[0];
        table.insertRow();
        let head = table.createTHead();
        let row = head.insertRow(0);
        let cell = row.insertCell(0);
        cell.innerHTML = "#";
        for (let stat in sim.counters) {
            if (sim.counters[stat].print) {
                let cell = row.insertCell(-1);
                cell.innerHTML = stat.replace(/_/g, ' ');
            }
        }
    }

    function writeResults(div, sim) {
        let table = div.getElementsByTagName("table")[0];
        let row = table.insertRow(1);
        let cell = row.insertCell(0);
        if (sim.event_stage === EpiAgents.EventStage.DURING) {
            cell.innerHTML = sim.iteration;
        } else if (sim.event_stage === EpiAgents.EventStage.BEFORE) {
            cell.innerHTML = "S";
        } else if (sim.event_stage === EpiAgents.EventStage.AFTER) {
            cell.innerHTML = "E";
        }
        for (let stat in sim.counters) {
            if (sim.counters[stat].print) {
                let cell = row.insertCell(-1);
                cell.innerHTML = sim.counters[stat].num;
            }
        }
    }

    function createUIElements(div_id) {
        let div = document.getElementById(div_id);

        let sim_div =  document.createElement("div");
        sim_div.classList.add('epi-game');
        let sim_min_max = document.createElement("button");
        sim_min_max.classList.add("epi-min-max");
        sim_min_max.textContent = "x";
        sim_div.append(sim_min_max);
        div.append(sim_div);

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

        let downloadConfig = document.createElement("div");
        downloadConfig.classList.add('epi-download');
        parameterBox.append(downloadConfig);

        let showZeros = document.createElement("div");
        showZeros.classList.add('epi-show-zeros');
        downloadConfig.append(showZeros);

        let resultsBox = document.createElement("div");
        resultsBox.classList.add("epi-results-box");

        let resultsMinMax = document.createElement("button");
        resultsMinMax.classList.add("epi-min-max");
        resultsMinMax.textContent = "x";
        resultsBox.append(resultsMinMax);
        let results = document.createElement("div");
        results.classList.add('epi-results');

        let table = document.createElement("table");
        results.append(table);
        resultsBox.append(results);
        div.append(resultsBox);

        let downloadResults = document.createElement("div");
        downloadResults.classList.add('epi-download');
        resultsBox.append(downloadResults);

        let controls = document.createElement("div");
        controls.classList.add('epi-controls');
        div.append(controls);

        let play = document.createElement("button");
        play.textContent = "Run";
        play.classList.add('epi-button');
        controls.append(play);

        let step = document.createElement("button");
        step.textContent = "Step";
        step.classList.add('epi-button');
        controls.append(step);

        let reset = document.createElement("button");
        reset.textContent = "Reset";
        reset.classList.add('epi-button');
        controls.append(reset);

        ui_elements[div_id] = {
            'sim_div': sim_div,
            'chart': chart,
            'parameterBox': parameterBox,
            'parameters': parameters,
            'results': results,
            'showZeros': showZeros,
            'downloadResults': downloadResults,
            'downloadConfig': downloadConfig,
            'play': play,
            'step': step,
            'reset': reset,
        };
    }


    function changeParameter(sim, elem) {
        let id = elem.id;
        const to = id.length - "-slider".length;
        const l_i = sim.inf_slider.length;
        const l_t = sim.ini_slider.length;
        if (id.substr(0, l_i) === sim.inf_slider) {
            const stage = id.substring(l_i, to);
            sim.stages[stage].infectiousness = elem.value;
        } else if (id.substr(0, l_t) === sim.ini_slider) {
            const stage = id.substring(l_t, to);
            sim.stages[stage].initialRatio = elem.value;
        }
    }

    function makeInput(elem, desc, div_id, val, name, min=0, max=2000, step=1) {
        let output =
            "<span class='epi-entry'>" + "<label for='" + div_id + name + "' " +
            "class='epi-description'>" + desc + "</label>" +
            "<input id='" + div_id + name + "' class='epi-value' value=" + val +
            " /> <input id='" + div_id + name + "-slider'" +
            " type='range' min=" + min + " max=" + max + " step=" + step +
            " class='epi-slider' value=" + val + " /></span>";
        elem.insertAdjacentHTML("beforeend", output);
        document.getElementById(div_id + name).
            addEventListener("change", function(e) {
                let slider =  document.getElementById(div_id + name + '-slider');
                slider.value = parseFloat(e.target.value);
                let event = new Event('input');
                slider.dispatchEvent(event);
            });
        document.getElementById(div_id + name + '-slider').
            addEventListener("input", function(e) {
                document.getElementById(div_id + name).value = e.target.value;
            });
    }

    function setupTransitionTable(sim, elem) {
        const keys = Object.keys(sim.stages);
        const n = keys.length;
        let table = document.createElement("table");
        table.classList.add("epi-transition-table");
        elem.appendChild(table);
        let head = table.createTHead();
        let row = head.insertRow();
        for (let i = 0; i <= n; i++) {
            let cell = row.insertCell();
            if (i == 0)
                cell.innerHTML = "<sub>from</sub>&#9;<sup>to</sup>";
            else
                cell.innerHTML = sim.stages[keys[i - 1]].description;
        }
        for (let i = 0; i < n; i++) {
            let row = table.insertRow();
            for (let j = 0; j <= n; j++) {
                let cell = row.insertCell();
                if (j == 0) {
                    cell.innerHTML = sim.stages[keys[i]].description;
                } else if (i != j-1) {
                    const from = keys[i];
                    const to = keys[j-1];
                    cell.classList.add("epi-transition-" + from + "-" + to);
                    cell.classList.add("epi-transition-editable");
                    cell.contentEditable = true;
                    cell.addEventListener("input", function(e) {
                        sim.stages[from].nextStageProb[to] =
                            Math.max(0.0,
                                     Math.min(1.0,
                                              parseFloat(e.target.textContent)));
                    });
                    if (to in sim.stages[from].nextStageProb) {
                        cell.innerHTML = sim.stages[from].nextStageProb[to];
                    } else {
                        cell.innerHTML = 0.0;
                    }
                } else {
                    cell.classList.add("epi-transition-na");
                }
            }
        }
    }

    function showParameters(sim, elem) {
        elem.innerHTML = "";
        let infectious_ids = [];
        let initialRatio_ids = [];
        let output = "";
        if (sim.config.name)
            output += "<h2 class='epi-model-name'>" +
            sim.config.name + "</h2>";
        if (sim.config.description)
            output += "<p class='epi-model-description'>" +
            sim.config.description +
            "<p>";
        elem.insertAdjacentHTML("beforeend", output);

        makeInput(elem, "Number of agents", sim.div_id, sim.config.numAgents,
                            "-agents", 0, 5000, 1);
        makeInput(elem, "speed (millisecs)", sim.div_id, sim.config.interval,
                  "-speed");

        const clusterWidth = sim.clusters[0].right - sim.clusters[0].left;
        const clusterHeight = sim.clusters[0].bottom - sim.clusters[0].top;
        console.log(sim, clusterWidth, clusterHeight, clusterWidth * clusterHeight,
                    sim.config.maxArea);
        let area = (Math.sqrt(clusterWidth * clusterHeight) /
                    Math.sqrt(sim.config.maxArea) * 100).
            toFixed(1);
        makeInput(elem, "area (% of max)", sim.div_id, area, "-area",
                  10, 100, 1);

        const stages = sim.stages;

        // Infectiousness
        elem.insertAdjacentHTML("beforeend",
                                "<h2 class='epi-model-infectiousness'>" +
                                "Infectiousness</h2>");
        for (const stage in stages) {
            if (stage.substr(0, 8) === "INFECTED") {
                makeInput(elem, stages[stage].description, sim.inf_slider,
                          stages[stage].infectiousness.toFixed(2),
                          stage, 0, 1, 0.01);
                infectious_ids.push(sim.inf_slider + stage + "-slider");
            }
        }

        // Initial Ratios
        elem.insertAdjacentHTML("beforeend",
                                "<h2 class='epi-model-initial-ratios'>" +
                                "Initial ratios</h2>");
        for (const stage in stages) {
            if (stage !== "DEAD") {
                makeInput(elem, stages[stage].description, sim.ini_slider,
                          stages[stage].initialRatio, stage, 0, 1000, 1);
                initialRatio_ids.push(sim.ini_slider + stage + "-slider");
            }
        }

        elem.insertAdjacentHTML("beforeend",
                                "<h2 class='epi-model-transitions'>" +
                                "Transitions</h2>");
        setupTransitionTable(sim, elem);

        const widgets = {
            "infectious_ids": infectious_ids,
            "initialRatio_ids": initialRatio_ids,
        };
        return widgets;
    }

    function setupShowZeros(div_id, sim) {
        const id = 'epi-show-zeros-checkbox-' + div_id;
        let output = '';
        output += '<label for="' + id + '">Show zeros</label>';
        output +=
            '<input type="checkbox" id="' + id + '" ' +
            'name="epi-show-zeros-checkbox"';
        if (sim.show_zeros) {
            output += 'checked >';
        } else {
            output += '></div>';
        }
        ui_elements[div_id].showZeros.innerHTML = output;
        document.getElementById(id).addEventListener(
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

    function downloadFile(filename, text,
                          mime='data:application/csv;charset=utf-8,') {
        var e = document.createElement('a');
        e.setAttribute('href', mime + encodeURIComponent(text));
        e.setAttribute('download', filename);
        e.style.display = 'none';
        document.body.appendChild(e);
        e.click();
        document.body.removeChild(e);
    }

    function setupDownloadConfig(div_id, sim) {
        const id = 'epi-download-config-link-' + div_id;
        const output = '<a href="#"' + 'id="' + id +
              '" class="epi-download-link">Configuration as JSON</a>';

        ui_elements[div_id].downloadConfig.insertAdjacentHTML("afterbegin", output);
        document.getElementById(id).addEventListener(
            "click", function (e) {
                let text = EpiAgents.objToString(sim.config);
                downloadFile("epiconfig.json", text,
                             'data:text/javascript;charset=utf-8,');
            });
    }

    function setupDownloadResults(div_id, sim) {
        const id = 'epi-download-results-link-' + div_id;
        const output = '<a href="#"' + 'id="' + id +
              '" class="epi-download-link">Results as CSV</a>';

        ui_elements[div_id].downloadResults.innerHTML = output;
        document.getElementById(id).addEventListener(
            "click", function (e) {
                let text = "";
                for (let result of sim.results) {
                    for (let cell of result) {
                        text += cell + ",";
                    }
                    text += "\n";
                }
                downloadFile("epiresults.csv", text);
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
        let reset = ui_elements[div_id].reset;
        play.addEventListener("click", function (e) {
            if (sim.state == EpiAgents.SimulationState.PAUSED) {
                e.target.textContent = "Pause";
                step.disabled = true;
                reset.disabled = true;
                sim.play();
            } else {
                e.target.textContent = "Run";
                step.disabled = false;
                reset.disabled = false;
                sim.pause();
            }
        });
        step.addEventListener("click", function (e) {
            if (sim.state == EpiAgents.SimulationState.PAUSED) {
                sim.step();
            }
        });
        reset.addEventListener("click", function (e) {
            let div = document.getElementById(div_id);
            div.innerHTML = "";
            let stages = ui_elements[div_id].stages;
            let options = ui_elements[div_id].options;
            ui_elements[div_id] = undefined;
            let tempSim = create(div_id, options);
            for (let obj in tempSim) {
                sim[obj] = tempSim[obj];
            }
            sim.stages = EpiAgents.deepCopy(stages);
            init(sim, div_id);
        });


        let widgets = showParameters(sim, ui_elements[div_id].parameters);
        setupShowZeros(div_id, sim);
        setupDownloadConfig(div_id, sim);
        setupDownloadResults(div_id, sim);

        document.getElementById(div_id + '-agents-slider').
            addEventListener("input", function(e) {
                let numAgents = e.target.value;
                if (numAgents > sim.config.numAgents) {
                    let from = sim.config.numAgents;
                    sim.generateAgents(numAgents - sim.config.numAgents);
                    sim.calcInitialRatios();
                    sim.calcInitialStages(from, numAgents);
                } else {
                    sim.removeAgents(sim.config.numAgents - numAgents);
                }
                eventDrawCanvas(sim);
                if (sim.state === EpiAgents.SimulationState.PLAYING) {
                    sim.pause();
                    sim.play();
                }
            });

        document.getElementById(div_id + '-speed-slider').
            addEventListener("input", function(e) {
                sim.config.interval = e.target.value;
                if (sim.state === EpiAgents.SimulationState.PLAYING) {
                    sim.pause();
                    sim.play();
                }
            });

        document.getElementById(div_id + '-area-slider').
            addEventListener("input", function(e) {
                let prop = parseFloat(e.target.value) / 100.0;
                for (let cluster of sim.clusters) {
                    cluster.right =
                        Math.min(cluster.left + prop * sim.config.width,
                                 sim.config.width);
                    cluster.bottom =
                        Math.min(cluster.top + prop * sim.config.height,
                                 sim.config.height);
                }
                for (let a of sim.agents) a.correctPosition();
                eventDrawCanvas(sim);
            });

        for (let id of widgets["initialRatio_ids"]) {
            document.getElementById(id).addEventListener(
                "input", function (e) {
                    changeParameter(sim, e.target); });
        }
        for (let id of widgets["infectious_ids"]) {
            document.getElementById(id).addEventListener(
                "input", function (e) {
                    changeParameter(sim, e.target); });
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

    function init(sim, div_id) {
        correctDimensions(div_id, sim);
        createSimulationCanvas(div_id, sim);
        sim.initialize();
        eventDrawCanvas(sim);
        assignEvents(div_id, sim);
        writeResultsHeader(ui_elements[div_id].results, sim);
        writeResults(ui_elements[div_id].results, sim);
        EpiAgents.eventRecordResultHeader(sim);
        EpiAgents.eventRecordResult(sim);
        sim.chart = createGraph(ui_elements[div_id].chart, sim);
        ui_elements[div_id].stages = EpiAgents.deepCopy(sim.stages);
    }

    function create(div_id, options={}) {
        createUIElements(div_id);
        let chart = {};
        let override_options = options;
        override_options.extraBeforeEvents = options.extraBeforeEvents ||
            [eventDrawCanvas];
        override_options.extraDuringEvents = options.extraDuringEvents ||
            [
                eventDrawCanvas,
                function(sim)
                {
                    writeResults(ui_elements[div_id].results, sim);
                    updateGraph(sim);
                }
            ];
        override_options.extraAfterEvents = options.extraAfterEvents ||
            [eventDrawCanvas];

        let sim = new EpiAgents.Simulation(options);
        sim.sim_div = ui_elements[div_id].sim_div;
        sim.canvas = null;
        sim.ctx = null;
        sim.div_id = div_id;
        sim.inf = INF + div_id;
        sim.ini = INI + div_id;
        sim.inf_slider = sim.inf + "-";
        sim.ini_slider = sim.ini + "-";
        sim.show_zeros = true;

        sim.chart_options = override_options.chart_options ||
            EpiAgentsUI.default_options.chart_options;

        sim.init = function() {
            init(sim, div_id);
        }
        ui_elements[div_id].options = EpiAgents.deepCopy(options);

        if (options.auto_play) {
            init(sim, div_id);
            sim.play();
        } else if (options.init) {
            init(sim, div_id);
        }

        return sim;
    }

    EpiAgentsUI.create = create;

} (window.EpiAgentsUI = window.EpiAgentsUI || {}));
