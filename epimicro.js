/*
  EpiMacro: Agent-based models for infectious disease epidemics.

  Copyright (C) 2022  Nathan Geffen

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

  const deepCopy = function(aObject) {
    if (!aObject) return aObject;
    if (typeof aObject === "string" || typeof aObject === "number")
      return aObject;
    let v;
    let bObject = Array.isArray(aObject) ? [] : {};
    for (const k in aObject) {
      v = aObject[k];
      bObject[k] = (typeof v === "object") ? deepCopy(v) : v;
    }
    return bObject;
  }

  EpiMicro.deepCopy = deepCopy;

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
          'compartment': compartment
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

  EpiMicro.eventSetAgentPositions = function(model) {
    const radius = (model.options && model.options.radius) ||  4;
    const gap = (model.options && model.options.gap) || radius;
    const width = (model.options && model.options.width) ||
          (Math.sqrt(model.agents.length) + 1) * (radius + gap);
    const height = width;
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

  EpiMicro.eventSetAgentCompartments = function(model) {
    let i = 0;
    for (const [compartment, num] of Object.entries(model.compartments)) {
      let end = i + num;
      for (; i < end; i++)
        model.agents[i]['compartment'] = compartment;
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

  const calcN = function(model) {
    let N = 0;
    for (let agent of model.agents) {
      if (! (model.parameters.ignore &&
             model.parameters.includes(agent[compartment]) == true) )
        ++N;
    }
    return N;
  }

  const calcCompartments = function(model, compartments) {
    let total = 0;
    for (let agent of model.agents)
      if (compartments.includes(agent.compartment))
        ++total;
    return total;
  }

  EpiMicro.eventStoI = function(model, from, to, beta, I=undefined) {
    if (I === undefined)
      I = [to];
    const delta = beta * calcCompartments(model, I);
    let i = 0;
    for (let agent of model.agents)
      if (agent.compartment == 'S') {
        if (Math.random() < delta)
          agent.compartment = to;
      }
  }

  EpiMicro.eventFromToRisk = function(model, from, to, risk) {
    for (let agent of model.agents)
      if (agent.compartment == from)
        if (Math.random() < risk)
          agent.compartment = to;
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
    model.working = model.working || {};
    EpiMicro.runBeforeEvents(model);
    let series = EpiMicro.iterateModel(model, model.parameters.iterations);
    EpiMicro.runAfterEvents(model);
    return series;
  }

  EpiMicro.runSimulations = function(model, n) {
    let simulationSeries = [];
    for (let i = 0; i < n; i++) {
      let m = deepCopy(model);
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
