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
    let numAgents = model.numAgents || function() {
      let total = 0;
      for (const [compartment, num] of Object.entries(model.compartments))
        total += num;
      return total;
    }();
    model.agents = [];
    for (let i = 0; i < numAgents; i++)
      model.agents.push({});
  }

  EpiMicro.eventSetAgentIds = function(model) {
    let i = 0;
    for (let agent of model.agents) {
      ++i;
      model.agents['id'] = i;
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

  EpiMicro.eventStoI = function(model) {
    const N = calcCompartments(model, ['S', 'I', 'R']);
    const S = calcCompartments(model, ['S']);
    const I = calcCompartments(model, ['I']);
    const newInfected = model.parameters.β * S * I / N;
    const newInfectedRisk = newInfected / S;
    for (let agent of model.agents)
      if (agent.compartment == 'S') {
        if (Math.random() < newInfectedRisk) {
          agent.compartment = 'I';
        }
      }
  }

  EpiMicro.eventFromToRisk = function(model, from, to, risk) {
    for (let agent of model.agents)
      if (agent.compartment == from)
        if (Math.random() < risk) {
          agent.compartment = to;
        }
  }

  EpiMicro.eventTallyCompartments = function(model) {
    for (const compartment in model.compartments)
      model.compartments[compartment] = 0;
    for (let agent of model.agents)
      ++model.compartments[agent.compartment];
  }

  /*************/

  const runEvents = function(model, events) {
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

  EpiMicro.iterateModel = function(model) {
    const defaultIterations = 1000;
    const defaultTimeBetweenIteration = 0;
    const iterations = (model.parameters && model.parameters.iterations) ||
          defaultIterations;
    const timeBetweenIterations = (model.parameters &&
                                   model.parameters.timeBetweenIterations) ||
          defaultTimeBetweenIteration;
    EpiMicro.runBeforeEvents(model);
    let i = 0;
    const timer = setInterval(function() {
      if (i >= iterations) {
        clearInterval(timer);
        EpiMicro.runAfterEvents(model);
      } else {
        i++;
        model.currentIteration = i;
        EpiMicro.runDuringEvents(model);
      }
    }, timeBetweenIterations);
  }

} (window.EpiMicro = window.EpiMicro || {}));

const sirMicroModel = {

  compartments: {
    'S': 98,
    'I': 2,
    'R': 0,
  },
  parameters: {
    β: 0.5,
    γ: 0.15,
    ignoreN: [],
    iterations: 100,
  },

  beforeEvents: [
    EpiMicro.eventCreateAgents, EpiMicro.eventSetAgentIds,
    EpiMicro.eventSetAgentCompartments
  ],

  duringEvents: [
    EpiMicro.eventShuffle, EpiMicro.eventStoI,
    function(model) {
      EpiMicro.eventFromToRisk(model, 'I', 'R', model.parameters.γ);
    },
    EpiMicro.eventTallyCompartments
  ],

  afterEvents: [],

};
