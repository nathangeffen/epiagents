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

(function (EpiMacro) {

  /* Taken from Stack Overflow answer on deep copying. */
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

  EpiMacro.delta_S_I = function(compartments, from, to, beta, I=undefined) {
    if (I === undefined)
      I = [to];
    let total = 0.0;
    for (const i of I)
      total  += compartments[i];
    const delta = beta * total;
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
      if (from !== '_' && from !== '*') {
        if (to === "*")
          newCompartments[from] = value;
        else
          newCompartments[from] -= value;
      }
      if (to !== '_' && to !== '*') {
        if (from === '*')
          newCompartments[to] = value;
        else
          newCompartments[to] += value;
      }
    }
    return newCompartments;
  }

  EpiMacro.initializeModel = function(model) {
    if ("initialize" in model)
      for (const func of model.initialize)
        func(model);
  }

  EpiMacro.iterateModelOnce = function(model) {
    return EpiMacro.updateCompartments(model.compartments,
                                       EpiMacro.calcTransitions(model));
  }

  EpiMacro.odeMethod = function(model, n) {
    let compartments = deepCopy(model.compartments);
    let y_vals = [];
    let c_names = [];
    for (let compartment in compartments) {
      y_vals.push(compartments[compartment]);
      c_names.push(compartment);
    }
    let diffFunc = model.ode(model);
    let ode_series = rungeKutta(diffFunc, y_vals, [0, n], 0.01);
    let series = [];
    for (let i = 1; i < ode_series.length; i++) {
      if (i % 100 == 0) {
        let normalized_entry = {};
        let j = 0;
        for (let name of c_names) {
          normalized_entry[name] = ode_series[i][j];
          j++;
        }
        series.push(normalized_entry);
      }
    }
    return series;
  }

  EpiMacro.iterateModel = function(model, n) {
    let series = [];
    // Default that model uses delta method for changing compartments
    if (! 'delta' in model) {
      model.delta = true;
    }
    if ('ode' in model) {
      series = EpiMacro.odeMethod(model, n);
      model.compartments = series[series.length - 1];
    } else {
      for (let i = 0; i < n; i++) {
        model.compartments = EpiMacro.iterateModelOnce(model);
        series.push(model.compartments);
      }
    }
    return series;
  }
} (window.EpiMacro = window.EpiMacro || {}));
