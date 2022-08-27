/*
  EpiMacro: Compartment models user interface for infectious disease epidemics.

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

(function (EpiMacroUI) {

  function printHeader(table, result) {
    let thead = document.createElement("thead");
    table.append(thead);
    let tr = document.createElement("tr");
    thead.append(tr);
    const keys = Object.keys(result);
    let th_i = document.createElement("th");
    th_i.textContent = "#";
    tr.append(th_i);
    for (const key of keys) {
      let th = document.createElement("th");
      th.textContent = key;
      tr.append(th);
    }
  }

  function printResult(result, tbody, rowNumber, decimals=2) {
    let tr = document.createElement("tr");
    tbody.append(tr);
    let td = document.createElement("td");
    td.textContent = rowNumber;
    tr.append(td);
    for (const value of Object.values(result)) {
      let td = document.createElement("td");
      td.textContent = value.toFixed(decimals);
      tr.append(td);
    }
  }

  function printResults(series, elem, options = {}) {
    const decimals = options.decimals || 2;
    let div = document.createElement("div");
    div.classList.add("macro-results-table-holder");
    let table = document.createElement("table");
    table.classList.add("macro-results-table");
    printHeader(table, series[0]);
    let tbody = document.createElement("tbody");
    table.append(tbody);
    let rowNumber = 0;
    for (const result of series) {
      printResult(result, tbody, rowNumber, decimals);
      rowNumber++;
    }
    div.append(table);
    elem.append(div);
  }



  function makeChart(series, elem, options = {})
  {
    const colors = options.colors ||  ["red", "green", "blue"];
    const chartjsOptions = options.chartjsOptions || {};
    const result_0 = series[0];
    let datasets = [];
    let i = 0;
    for (const key of Object.keys(result_0)) {
      datasets.push({
        label: key,
        backgroundColor: colors[i % colors.length],
        borderColor: colors[i % colors.length],
        data: series.map(result => result[key])
      });
      i++;
    }
    const config = {
      type: 'line',
      data: {
        labels: Array.from(Array(series.length).keys()),
        datasets: datasets,
      },
      options: chartjsOptions
    };
    const ctx = elem.getContext('2d');
    let chart = new Chart(ctx, config);
    return chart;
  }

  function outputResultsChart(series, resultsElem, chartElem,
                              resultsOptions={}, chartOptions={}) {
    printResults(series, resultsElem, resultsOptions);
    makeChart(series, chartElem, chartOptions);
  }


  const defaultIterations = 1000;

  function calc(model, resultsElem, chartElem, options={}) {
    const iterations = (model.parameters && model.parameters.iterations) ||
          defaultIterations;
    const resultsOptions = options.resultsOptions;
    const chartOptions = options.chartOptions;
    let series = EpiMacro.iterateModel(model, iterations);
    outputResultsChart(series, resultsElem, chartElem,
                       resultsOptions, chartOptions);
  }

  function createDivs(model, div, options) {
    let resultsDiv = document.createElement('div');
    resultsDiv.classList.add('macro-results');
    let chartDiv = document.createElement('div');
    chartDiv.classList.add('macro-chart');
    let chartCanvas = document.createElement('canvas');
    chartCanvas.classList.add('macro-chart-canvas');
    chartDiv.append(chartCanvas);
    let parametersDiv = document.createElement('div');
    parametersDiv.classList.add('macro-parameters');
    div.append(resultsDiv);
    div.append(chartDiv);
    div.append(parametersDiv);
    let recalcButtonDiv = document.createElement('div');
    recalcButtonDiv.classList.add('macro-recalc');
    let recalcButton = document.createElement('button');
    recalcButton.textContent = "Recalc";
    div.append(recalcButtonDiv);
    recalcButtonDiv.append(recalcButton);
    return [resultsDiv, chartDiv, parametersDiv, recalcButtonDiv];
  }

  function setupParameters(div, model, options) {

    function setupSingleParameter(group, key, value) {
      let parameter = {};
      parameter.label = key;
      parameter.value = value;
      parameter.onChange = function(obj, elem) {
        obj[key] = Number(elem.value);
      }
      let label = document.createElement('label');
      let input = document.createElement('input');
      label.textContent = parameter.label;
      const id = "input-" + parameter.label;
      label.htmlFor = id;
      input.id = id;
      input.value = parameter.value;
      input.type = "number";
      input.addEventListener('change', function(e) {
        parameter.onChange(group, e.target);
      });
      div.append(label);
      div.append(input);
    }

    const parametersOptions = options.parametersOptions;
    const include = parametersOptions && parametersOptions.include;
    if (include === undefined || include === "all") {
      for (const [key, value] of Object.entries(model.compartments))
        setupSingleParameter(model.compartments, key, value);
      for (const [key, value] of Object.entries(model.parameters))
        setupSingleParameter(model.parameters, key, value);
    }
  }


  function run(model, div, options={}) {
    const [resultsDiv, chartDiv, parametersDiv, recalcButtonDiv] =
          createDivs(model, div, options);
    const chartElem = chartDiv.querySelector('canvas');
    setupParameters(parametersDiv, model, options);
    calc(model,resultsDiv, chartElem, options);
    let recalc = recalcButtonDiv.querySelector('button');
    recalc.addEventListener('click', function() {
      // Clear results
      resultsDiv.innerHTML = "";
      // Reset canvas
      let canvas = chartDiv.querySelector('canvas');
      chartDiv.removeChild(canvas);
      canvas = document.createElement('canvas');
      chartDiv.appendChild(canvas);
      calc(model,resultsDiv, canvas, options);
    });
  }

  // Exports
  EpiMacroUI.run = run;

} (window.EpiMacroUI = window.EpiMacroUI || {}));
