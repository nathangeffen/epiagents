/*
  EpiMacro: Compartment models for infectious disease epidemics.

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

(function (EpiMacro) {

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

  EpiMacro.delta_S_I = function(compartments, from, to, beta, N) {
    return {
      'from': from,
      'to': to,
      'value': beta * compartments[from] * compartments[to] / N
    }
  }

  EpiMacro.delta_X_Y = function(compartments, from, to, prop) {
    return {
      'from': from,
      'to': to,
      'value': prop * compartments[from]
    };
  }


  EpiMacro.calcN = function(compartments, ignore=[]) {
    let N = 0;
    for (const [key, value] of Object.entries(compartments))
      if (ignore.includes(key) === false) N += value;
    return N;
  }

  EpiMacro.calcTransitions = function(model) {
    let deltas = [];
    for (const transition of model.transitions)
      deltas.push(transition(model));
    return deltas;
  }

  EpiMacro.updateCompartments = function(compartments, deltas) {
    let newCompartments = {};
    for (const [key, value] of Object.entries(compartments))
      newCompartments[key] = value;
    for (let delta of deltas) {
      let from = delta.from;
      let to = delta.to;
      let value = delta.value;
      newCompartments[from] -= value;
      newCompartments[to] += value;
    }
    return newCompartments;
  }

  EpiMacro.iterateModelOnce = function(model) {
    return EpiMacro.updateCompartments(model.compartments,
                                       EpiMacro.calcTransitions(model));
  }

  EpiMacro.iterateModel = function(model, n) {
    let series = [];
    let currentCompartments = {};
    series.push(model.compartments);
    let updatedModel = deepCopy(model);
    for (let i = 1; i <= n; i++) {
      updatedModel.compartments = EpiMacro.iterateModelOnce(updatedModel);
      series.push(updatedModel.compartments);
    }
    return series;
  }
} (window.EpiMacro = window.EpiMacro || {}));


const exampleMacroModel = {
  compartments:  {
    'S': 98,
    'I': 2,
    'R': 0
  },

  parameters: {
    β: 0.5,
    γ: 0.15,
    iterations: 100,
  },

  transitions: [
    function(model) {
      return EpiMacro.delta_S_I(model.compartments, 'S', 'I',
                                model.parameters.β,
                                EpiMacro.calcN(model.compartments, []));
    },
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'I', 'R',
                                model.parameters.γ);
    }
  ]
};
