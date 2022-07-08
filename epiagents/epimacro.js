"use strict";

(function (EpiMacro) {

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

  EpiMacro.calcTransitions = function(compartments, transitions) {
    let deltas = [];
    for (const transition of transitions)
      deltas.push(transition(compartments));
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

  EpiMacro.iterateModelOnce = function(compartments, transitions) {
    return EpiMacro.updateCompartments(compartments,
                              EpiMacro.calcTransitions(compartments, transitions));
  }

  EpiMacro.iterateModel = function(compartments, transitions, n) {
    for (let i = 0; i < n; i++)
      compartments = EpiMacro.iterateModelOnce(compartments, transitions);
    return compartments;
  }

  EpiMacro.iterateModelAsTimeSeries = function(compartments, transitions, n) {
    let series = [];
    for (let i = 0; i < n; i++) {
      compartments = EpiMacro.iterateModelOnce(compartments, transitions);
      series.push(compartments);
    }
    return series;
  }
} (window.EpiMacro = window.EpiMacro || {}));


const exampleModel = {
  compartments:  {
    'S': 98,
    'I': 2,
    'R': 0
  },

  transitions: [
    function(compartments) {
      return EpiMacro.delta_S_I(compartments, 'S', 'I', 0.1,
                                EpiMacro.calcN(compartments, []));
    },
    function(compartments) {
      return EpiMacro.delta_X_Y(compartments, 'I', 'R', 0.05);
    }
  ]
};

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
    let table = document.createElement("table");
    table.classList.add("epi-results-table");
    printHeader(table, series[0]);
    let tbody = document.createElement("tbody");
    table.append(tbody);
    let rowNumber = 0;
    for (const result of series) {
      printResult(result, tbody, rowNumber, decimals);
      rowNumber++;
    }
    elem.append(table);
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
    console.log(datasets);
    console.log(Array.from(Array(series.length).keys()));
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

  function outputResultsAndChart(series, resultsElem, chartElem,
                                 resultsOptions={}, chartOptions={}) {
    printResults(series, resultsElem, resultsOptions);
    makeChart(series, chartElem, chartOptions);
  }

  function runAndOutputResultsAndChart(model, resultsElem, chartElem, options={}) {

    const iterations = (options.model && options.model.iterations) || 1000;
    const resultsOptions = options.resultsOptions;
    const chartOptions = options.chartOptions;
    let series = EpiMacro.iterateModelAsTimeSeries(model.compartments,
                                                   model.transitions, iterations);
    outputResultsAndChart(series, resultsElem, chartElem, resultsOptions, chartOptions);
  }

  function run(model, div, options={}) {
    let resultsDiv = document.createElement('div');
    let chartCanvas = document.createElement('canvas');
    div.append(resultsDiv);
    div.append(chartCanvas);
    runAndOutputResultsAndChart(model, resultsDiv, chartCanvas, options);
  }

  // Exports
  EpiMacroUI.printResults = printResults;
  EpiMacroUI.makeChart = makeChart;
  EpiMacroUI.outputResultsAndChart = outputResultsAndChart;
  EpiMacroUI.runAndOutputResultsAndChart = runAndOutputResultsAndChart;
  EpiMacroUI.run = run;

} (window.EpiMacroUI = window.EpiMacroUI || {}));
