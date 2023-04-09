/*
  Epidemiological modelling demonstration: Macro and micro models for
  infectious disease epidemics.

  Copyright (C) 2023  Nathan Geffen

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as
  published by the Free Software Foundation, either version 3 of the
  License, or (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/


"use strict";

(function (EpiMicro) {

  EpiMicro.DAY = 1.0 / 365.25;
  EpiMicro.FEMALE = 0;
  EpiMicro.MALE = 1;

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  /* Typical before simulation events */

  EpiMicro.eventCreateAgents = function(model) {
    model.agents = [];
    for (const [compartment, num] of Object.entries(model.compartments)) {
      for (let i = 0; i < num; i++) {
        model.agents.push({
          'compartment': compartment,
          'changed': false
        });
      }
    }
  }

  EpiMicro.eventSetAgentIds = function(model) {
    let i = 0;
    for (let agent of model.agents) {
      ++i;
      agent.id = i;
    }
  }

  const setdxdy = function(agent) {
    const dxdy = [ [-1, -1], [-1, 0], [-1, 1],
                   [0, -1], [0, 1],
                   [1, -1], [1, 0], [1, 1]];
    const index = Math.floor(Math.random() * dxdy.length);
    const [dx, dy] = dxdy[index];
    agent.dx = dx;
    agent.dy = dy;
  }


  EpiMicro.eventSetAgentPositions = function(model) {
    const radius = (model.options && model.options.radius) ||  4;
    const gap = (model.options && model.options.gap) || radius;
    const width = model.working.width || (model.options && model.options.width) ||
          (Math.sqrt(model.agents.length) + 1) * (radius + gap);
    const height = model.working.height || width;
    const area = width * height;
    model.working.width = width;
    model.working.height = height;
    model.working.radius = radius;
    model.working.gap = gap;

    let x = 0;
    let y = gap + radius;
    for (const agent of model.agents) {
      x += gap + radius;
      if (x >= width - gap) {
        x = gap + radius;
        y += gap + radius;
      }
      agent.x = x;
      agent.y = y;
    }
  }

  EpiMicro.eventSetAgentdxdy = function(model) {
    for (let agent of model.agents) {
      setdxdy(agent);
    }
  }



  EpiMicro.eventRandomizeAgentPositions = function(model) {
    const radius = model.working.radius;
    const gap = (model.options && model.options.gap) || radius;
    const diameter = 2 * radius;
    const x_edge = model.working.width - radius;
    model.working.x_left = Math.floor(0.25 * model.working.width);
    const x_left = model.working.x_left + radius + gap;
    const width = x_edge - x_left;
    const height = model.working.height - radius - gap;
    let x_isolated = diameter;
    let y_isolated = diameter;

    const randomizeAgentPosition = function(agent) {
      agent.x = Math.floor(Math.random() * width) + x_left + radius + gap;
      agent.y = Math.floor(Math.random() * height);
    }

    const placeIsolatedAgent = function(agent) {
      agent.x = x_isolated;
      agent.y = y_isolated;
      x_isolated += radius + 2 * gap;
      if (x_isolated >= x_left - diameter) {
        x_isolated = diameter;
        y_isolated += radius + 2 * gap;
        if (y_isolated > height - diameter) {
          agent.x = Math.floor(Math.random() * (x_left - diameter));
          agent.y = Math.floor(Math.random() * (height - diameter));
        }
      }
    }

    for (let agent of model.agents) {
      if (agent.isolated === false) {
        randomizeAgentPosition(agent);
      } else {
        placeIsolatedAgent(agent);
      }
    }
    model.working.randomizeAgentPosition = randomizeAgentPosition;
    model.working.placeIsolatedAgent = placeIsolatedAgent;
  }

  EpiMicro.eventSetAgentCompartments = function(model) {
    let i = 0;
    for (const [compartment, num] of Object.entries(model.compartments)) {
      let end = i + num;
      for (; i < end; i++)
        model.agents[i]['compartment'] = compartment;
    }
  }

  EpiMicro.eventSetIsolate = function(model) {
    for (let agent of model.agents) {
      agent.isolated = false;
      agent.previously_isolated = false;
    }
  }

  EpiMicro.eventIsolateAgents = function(model) {
    if (model.parameters.Ξ > 0 && model.parameters.i > 0.0) {
      for (let agent of model.agents) {
        if (agent.compartment == 'I' && agent.isolated == false &&
            agent.previously_isolated == false) {
          let r = Math.random();
          if (r < model.parameters.i) {
            agent.isolated = true;
            agent.previously_isolated = true;
            model.working.placeIsolatedAgent(agent);
          }
        }
      }
    }
  }

  EpiMicro.eventUnisolateAgents = function(model) {
    if (model.parameters.Ξ > 0) {
      for (let agent of model.agents) {
        if (agent.isolated === true) {
          if (Math.random() < model.working.risk_leave_isolation) {
            agent.isolated = false;
            model.working.randomizeAgentPosition(agent);
          }
        }
      }
    }
  }

  EpiMicro.eventSetCompartmentColors = function(model) {
    const numColors = model.options.colors.length;
    let c = 0;
    model.working.colorMap = {};
    for (const compartment in model.compartments) {
      model.working.colorMap[compartment] = model.options.colors[c % numColors];
      c++;
    }
  }

  /* Typical during simulation events */

  EpiMicro.eventShuffle = function(model) {
    shuffleArray(model.agents);
  }

  EpiMicro.eventAge = function(model) {
    for (let agent of model.agents)
      agent.age += EpiMicro.DAY;
  }

  const distanceSquared = function(A, B) {
    const d_x = (A.x - B.x);
    const d_y = (A.y - B.y);
    return d_x * d_x + d_y * d_y;
  }

  EpiMicro.touching = function(A, B, radius) {
    const d = distanceSquared(A, B);
    if (d < 4 * radius * radius)
      return true;
    return false;
  }

  EpiMicro.moveAgent = function(model, A) {
    const radius = model.working.radius;
    if (Math.random() < 0.25) {
      setdxdy(A);
    }
    A.x += A.dx;
    A.y += A.dy;

    if (A.x >= model.working.width - radius) {
      A.x = model.working.width - radius;
      A.dx = -A.dx;
    }
    if (A.x <= model.working.x_left) {
      A.x = model.working.x_left + radius;
      A.dx = -A.dx;
    }
    if (A.y >= model.working.height - radius) {
      A.y = model.working.height - radius;
      A.dy = -A.dy;
    }
    if (A.y <= radius) {
      A.y = radius;
      A.dy = -A.dy;
    }
  }

  EpiMicro.eventMoveAgents = function(model) {
    for (let agent of model.agents) {
      if (agent.isolated === false) {
        EpiMicro.moveAgent(model, agent);
      }
    }
  }

  const calcN = function(model) {
    let N = 0;
    for (let agent of model.agents) {
      if (! (model.parameters.ignore &&
             model.parameters.includes(agent[compartment]) == true) )
        ++N;
    }
    return N;
  }

  const calcCompartmentsOld = function(model, compartments) {
    let total = 0;
    for (let agent of model.agents)
      if (compartments.includes(agent.compartment))
        ++total;
    return total;
  }

  const calcCompartments = function(model, compartments) {
    let total = 0;
    for (const [compartment, num] of Object.entries(model.compartments)) {
      if (compartments.includes(compartment)) {
        total += num;
      }
    }
    return total;
  }

  EpiMicro.infections = 0;
  EpiMicro.eventStoI = function(model, from, to, beta, I=undefined) {
    if (I === undefined)
      I = [to];
    const delta = beta * calcCompartments(model, I);
    let i = 0;
    for (let agent of model.agents) {
      if (agent.compartment == 'S' && agent.changed == false) {
        if (Math.random() < delta) {
          agent.compartment = to;
          agent.changed = true;
          ++EpiMicro.infections;
        }
      }
    }
  }

  EpiMicro.eventFromToRisk = function(model, from, to, risk) {
    for (let agent of model.agents)
      if (agent.compartment == from && agent.changed == false)
        if (Math.random() < risk) {
          agent.compartment = to;
          agent.changed = true;
        }
  }

  EpiMicro.eventResetChanged = function(model) {
    for (let agent of model.agents)
      agent.changed = false;
  }

  EpiMicro.eventTallyCompartments = function(model) {
    for (const compartment in model.compartments)
      model.compartments[compartment] = 0;
    for (let agent of model.agents)
      ++model.compartments[agent.compartment];
  }

  /*************/

  const runEvents = function(model, events) {
    if (events)
      for (let event of events)
        event(model);
  }

  EpiMicro.runBeforeEvents = function(model) {
    runEvents(model, model.beforeEvents);
  }

  EpiMicro.runDuringEvents = function(model) {
    runEvents(model, model.duringEvents);
  }

  EpiMicro.runAfterEvents = function(model) {
    runEvents(model, model.afterEvents);
  }

  EpiMicro.iterateModel = function(model, n) {
    let series = [];
    for (let i = 0; i < n; i++) {
      EpiMicro.runDuringEvents(model);
      series.push({
        ...model.compartments
      });
    }
    return series;
  }
  EpiMicro.runSimulation = function(model) {
    EpiMicro.infections = 0;
    model.working = model.working || {};
    EpiMicro.runBeforeEvents(model);
    let series = EpiMicro.iterateModel(model, model.parameters.iterations);
    EpiMicro.runAfterEvents(model);
    return series;
  }

  EpiMicro.runSimulations = function(model, n) {
    let simulationSeries = [];
    for (let i = 0; i < n; i++) {
      let m = EpiMacro.deepCopy(model);
      simulationSeries.push(EpiMicro.runSimulation(m));
    }
    return simulationSeries;
  }

  EpiMicro.mean = function(arr) {
    let total = 0.0;
    for (const n of arr) {
      total += n;
    }
    return total / arr.length;
  }

  EpiMicro.max = function(arr) {
    let m = Number.MIN_VALUE;
    for (const n of arr)
      if (n > m)
        m = n;
    return m;
  }

  EpiMicro.min = function(arr) {
    let m = Number.MAX_VALUE;
    for (const n of arr)
      if (n < m)
        m = n;
    return m;
  }

  EpiMicro.stat = function(simulationSeries, index, compartment, func) {
    let result = [];
    for (const series of simulationSeries) {
      let n;
      if (index >= 0) {
        n = index;
      } else {
        n = series.length + index;
      }
      result.push(series[n][compartment]);
    }
    return func(result);
  }

} (window.EpiMicro = window.EpiMicro || {}));
