/*
  Author: Nathan Geffen

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

"use strict";

(function (EpiAgents) {

    let SimulationStages = {
        SUSCEPTIBLE: {
            description: "susceptible",
            color: "rgb(0, 0, 255)",
            infected: false,
            infectiousness: 0.0,
            initial_ratio: 95,
            next_stage_prob: {
                VACCINATED: 0.0025
            }
        },
        INFECTED_EXPOSED: {
            description: "exposed",
            color: "rgb(200, 0, 0)",
            infected: true,
            infectiousness: 0.0,
            initial_ratio: 3,
            next_stage_prob: {
                INFECTED_ASYMPTOMATIC: 0.33
            }
        },
        INFECTED_ASYMPTOMATIC: {
            description: "asymptomatic",
            color: "rgb(210, 0, 0)",
            infected: true,
            infectiousness: 0.1,
            initial_ratio: 1,
            next_stage_prob: {
                INFECTED_SYMPTOMATIC: 0.33,
                RECOVERED: 0.33
            }
        },
        INFECTED_SYMPTOMATIC: {
            description: "symptomatic",
            color: "rgb(220, 0, 0)",
            infected: true,
            infectiousness: 0.5,
            initial_ratio: 1,
            next_stage_prob: {
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
            initial_ratio: 0,
            next_stage_prob: {
                INFECTED_ICU: 0.1,
                RECOVERED: 0.1
            }
        },
        INFECTED_ICU: {
            description: "intensive care",
            color: "rgb(240, 0, 0)",
            infected: true,
            infectiousness: 0.5,
            initial_ratio: 0,
            next_stage_prob: {
                DEAD: 0.5,
                RECOVERED: 0.1
            }
        },
        RECOVERED: {
            description: "recovered",
            color: "rgb(0, 150, 0)",
            infected: false,
            infectiousness: 0.0,
            initial_ratio: 0,
            next_stage_prob: {
                SUSCEPTIBLE: 0.001,
                VACCINATED: 0.001
            }
        },
        VACCINATED: {
            description: "vaccinated",
            color: "rgb(0, 255, 0)",
            infected: false,
            infectiousness: 0.0,
            initial_ratio: 0,
            next_stage_prob: {
                SUSCEPTIBLE: 0.0005
            }
        },
        DEAD: {
            description: "dead",
            color: "rgb(0, 0, 0)",
            infected: false,
            infectiousness: 0.0,
            initial_ratio: 0,
            next_stage_prob: {}
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
                         simulation.stages[stage].next_stage_prob) {
                        const risk = simulation.stages[stage].
                              next_stage_prob[next_stage];
                        if (Math.random() < risk) {
                            agent.stage = simulation.stages[next_stage];
                        }
                    }
                }
            }
        }
    }


    function eventCalcStats(simulation) {
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
            this.radius = simulation.agent_radius;
            this.id = simulation.agent_counter;
            simulation.agent_counter++;
            this.speed = simulation.agent_speed;
            this.stage = simulation.stages.SUSCEPTIBLE;
            this.x = Math.random() * simulation.width;
            this.y = Math.random() * simulation.height;
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
            if (Math.random() < 0.1) {
                this.setDirection();
            }

            if (this.x + this.dx > this.simulation.width - this.radius ||
                this.x + this.dx < this.radius) {
                this.dx = -this.dx;
            }
            if (this.y + this.dy > this.simulation.height - this.radius ||
                this.y + this.dy < this.radius) {
                this.dy = -this.dy;
            }

            this.detectInfections();

            this.x += this.dx;
            this.y += this.dy;
        }

        draw() {
            if (this.stage !== this.simulation.stages.DEAD) {
                let ctx = this.simulation.ctx;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2);
                ctx.fillStyle = this.stage.color;
                ctx.fill();
                ctx.closePath();
            }
        }
    };

    class Simulation {

        constructor(options) {
            this.name = options.name || null;
            this.description = options.description || null;
            this.div = options.div || null;
            this.canvas = options.canvas || null;
            this.ctx = null,
            this.width = options.width || 790;
            this.height = options.height || 500;
            this.state = SimulationState.PAUSED;
            this.interval = options.interval || 10;
            this.timer = undefined;
            this.num_agents = options.num_agents || 2000;
            this.agent_radius = options.agent_radius || 3;
            this.agent_counter = options.agent_counter || 0;
            this.agent_speed = options.agent_speed || 1.0;
            this.agents = [];

            // Events
            this.extra_before_events = options.extra_before_events || [];
            this.extra_during_events = options.extra_during_events || [];
            this.extra_after_events = options.extra_after_events || [];

            this.before_events = options.before_events ||
                [].concat(this.extra_before_events);
            this.during_events = options.during_events ||
                [eventAdvanceAgents, eventMoveAgents, eventCalcStats].
                concat(this.extra_during_events) || options.during_events;
            this.after_events = options.after_events ||
                [eventCalcStats].concat(this.extra_after_events);

            this.initial_exposed = 10 || options.initial_exposed;
            this.iteration = 0;
            this.max_iterations = options.max_iterations || 0;
            this.stages = JSON.parse(JSON.stringify(SimulationStages))
                || options.simulation_stages;

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
                this.stages[stage].initial_ratio = val;
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
            this.stages[from_stage].next_stage_prob[to_stage] = val;
        }
        setTransitions(arr) {
            for (const parms of arr) {
                this.setTransition(parms[0], parms[1], parms[2]);
            }
        }
        clearTransitions(stage) {
            this.stages[stage].next_stage_prob = {};
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

        drawCanvas() {
            this.ctx.clearRect(0, 0, this.width, this.height);
            for (let agent of this.agents) {
                agent.draw();
            }
        }

        beforeIteration() {
            this.event_stage = EventStage.BEFORE;
            this.runEvents(this.before_events);
            this.drawCanvas();
        };

        oneIteration() {
            this.event_stage = EventStage.DURING;
            this.runEvents(this.during_events);
            this.drawCanvas();
            ++this.iteration;
            if (this.max_iterations > 0 &&
                this.iteration % this.max_iterations === 0) {
                this.stop();
            }
        }

        afterIteration() {
            this.event_stage = EventStage.AFTER;
            this.runEvents(this.after_events);
            this.drawCanvas();
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

        setupSimulationCanvas() {
            if (this.canvas === null) {
                this.canvas = document.createElement("CANVAS");
                this.div.appendChild(this.canvas);
                this.canvas.width = this.width;
                this.canvas.height = this.height;
                this.ctx = this.canvas.getContext("2d");
            }
        }

        generateAgents(num_agents) {
            for (let i = 0; i < num_agents; i++) {
                this.agents.push(new Agent(this));
            }
        }

        calcInitialRatios() {
            let total = 0.0;
            for (const stage in this.stages) {
                total += this.stages[stage].initial_ratio;
            }
            let cumulative = 0.0;
            for (let stage in this.stages) {
                let r = this.stages[stage].initial_ratio / total + cumulative;
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
            this.generateAgents(this.num_agents);
        }

        initialize() {
            this.createAgents();
            this.calcInitialRatios();
            this.calcInitialStages();
            eventCalcStats(this);
            this.drawCanvas();
        }

        modelWorld(elem) {
            let output = "";
            if (this.name)
                output += "<h2 class='epi-model-name' contenteditable=true>" +
                this.name + "</h2>";
            if (this.description)
                output += "<p class='epi-model-description' contenteditable=true>" +
                this.description +
                "<p>";
            output+=
                "<p>" + "Number of agents: " + this.num_agents + "</p>";

            // Infectiousness
            output+= "<h2 class='epi-model-infectiousness'>Infectiousness</h2>"
            const stages = this.stages;
            for (const stage in stages) {
                if (this.show_zeros == true || stages[stage].infectiousness) {
                    output +=
                        "<span class='epi-entry'>" +
                        "<span class='epi-description'>" +
                        stages[stage].description +
                        "</span><span class='epi-value' contenteditable=true>" +
                        stages[stage].infectiousness.toFixed(2) +
                        "</span></span>"
                }
            }

            // Transitions
            output+= "<h2 class='epi-model-transitions'>Transitions</h2><p>"
            for (const from_stage in stages) {
                for (const to_stage in stages[from_stage].next_stage_prob) {
                    if (this.show_zeros == true ||
                        stages[from_stage].next_stage_prob[to_stage] != 0) {
                        output +=
                            "<span class='epi-entry'>" +
                            "<span class='epi-description'>" +
                            stages[from_stage].description + " - " +
                            stages[to_stage].description +
                            "</span><span class='epi-value' contenteditable=true>" +
                            stages[from_stage].next_stage_prob[to_stage].
                            toFixed(2) +
                            "</span>" +
                            "<input type='range' min='0' max='1.0' step='0.1' " +
                            "value='" +
                            stages[from_stage].next_stage_prob[to_stage].
                            toFixed(2) +
                            "' class='epi-slider'>" +
                            "</span>"
                    }
                }
            }
            output += "</p>"
            output += '<label for="epi-show-zeros">Show zeros</label>';
            output +=
                '<input type="checkbox" id="epi-show-zeros" ' +
                'name="epi-show-zeros"';
            if (this.show_zeros) {
                output += 'checked >';
            } else {
                output += '>';
            }

            elem.innerHTML = output;
        }
    }

    EpiAgents.save = function(sim) {
        const obj =  JSON.stringify(sim);
        console.log(obj);
    }

    EpiAgents.create = function(div, options={}) {
        let simulation = new Simulation(options);
        simulation.div = div;
        simulation.setupSimulationCanvas();
        return simulation;
    }

} (window.EpiAgents = window.EpiAgents || {}));


(function (EpiAgentsUI) {

    let ui_elements = {};

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
            options: {}
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

    function writeStats(div, simulation) {
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
        div.insertAdjacentHTML('beforeend', text);
    }

    function createUIElements(div_id) {
        let div = document.getElementById(div_id);

        let simulation =  document.createElement("div");
        simulation.classList.add('epi-canvas');
        div.append(simulation);

        let chart = document.createElement("canvas");
        chart.classList.add('epi-chart');
        div.append(chart);

        let modelWorld = document.createElement("div");
        modelWorld.classList.add('epi-model-world');
        div.append(modelWorld);

        let stats = document.createElement("div");
        stats.classList.add('epi-stats');
        div.append(stats);

        let play = document.createElement("button");
        play.textContent = "Play";
        play.classList.add('epi-button');
        div.append(play);

        let step = document.createElement("button");
        step.textContent = "Step";
        step.classList.add('epi-button');
        div.append(step);

        let save = document.createElement("button");
        save.textContent = "Save";
        save.classList.add('epi-button');
        div.append(save);

        ui_elements[div_id] = {
            'simulation': simulation,
            'chart': chart,
            'stats': stats,
            'modelWorld': modelWorld,
            'play': play,
            'step': step,
            'save': save
        };
    }

    function assignEvents(div_id, sim) {
        let play = ui_elements[div_id].play;
        let step = ui_elements[div_id].step;
        let save = ui_elements[div_id].save;
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
        save.addEventListener("click", function(e) {
            EpiAgents.save(sim);
        });

        sim.modelWorld(ui_elements[div_id].modelWorld);
    }

    EpiAgentsUI.create = function(div_id, options={}) {
        createUIElements(div_id);
        let chart = {};
        let override_options = options;
        override_options.extra_during_events = options.extra_during_events ||
            [function(simulation) {
                writeStats(ui_elements[div_id].stats, simulation);
                updateGraph(simulation, chart);
            }];

        let sim = EpiAgents.create(ui_elements[div_id].simulation,
                                   override_options);
        sim.div_id = div_id;
        sim.init = function() {
            sim.initialize();
            writeStats(ui_elements[div_id].stats, sim);
        }
        sim.show_zeros = true;

        chart = createGraph(ui_elements[div_id].chart, sim);
        assignEvents(div_id, sim);

        if (options.auto_play) {
            sim.init();
            sim.play();
        } else if (options.init) {
            sim.init();
        }

        return sim;
    }

} (window.EpiAgentsUI = window.EpiAgentsUI || {}));
