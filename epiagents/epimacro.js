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

  EpiMacro.deepCopy = deepCopy;

  EpiMacro.delta_S_I = function(compartments, from, to, beta) {
    const delta = beta * compartments[to];
    const S_I = delta * compartments[from];
    return {
      'from': from,
      'to': to,
      'value': S_I
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
    series.push(model.compartments);
    //let updatedModel = deepCopy(model);
    for (let i = 1; i <= n; i++) {
      model.compartments = EpiMacro.iterateModelOnce(model);
      series.push(model.compartments);
    }
    return series;
  }
} (window.EpiMacro = window.EpiMacro || {}));
