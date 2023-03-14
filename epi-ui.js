/*
  Epidemiological modelling demonstration.: Macro and micro models for
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

(function (EpiUI) {

  EpiUI.THREE_COLORS = ["green", "red", "blue"];
  EpiUI.FOUR_COLORS = ["green", "#BE9C9C", "red", "blue"];
  EpiUI.FIVE_COLORS = ["green", "#BE9C9C", "#CC5B5B", "red", "blue"];
  EpiUI.SIX_COLORS = ["green", "#BE9C9C", "#CC5B5B", "red",
                           "#B00707", "blue"];
  EpiUI.SEVEN_COLORS = ["green", "yellow", "#ffe6e6", "#ff9999", "#ff0000",
                             "##800000", "blue"];
  EpiUI.EIGHT_COLORS = ["green", "yellow", "#ffe6e6", "#ff9999", "#ff0000",
                             "#800000", "blue", "black"];
  EpiUI.NINE_COLORS = ["green", "yellow", "#ffe6e6", "#ff9999", "#ff0000",
                             "#800000", "blue", "gold", "black"];

  const MICRO = 1;
  const MACRO = 2;

  const MAX_POP = 5000;

  EpiUI.modelRegister = {};

  function modelType(model) {
    if ("duringEvents" in model) return MICRO;
    return MACRO;
  }

  EpiUI.modelType = modelType;

  function initChart(chartCanvas, iterations, options, result_0) {
    const colors = options.colors ||  EpiUI.THREE_COLORS;
    const chartjsOptions = options.chartjsOptions || {
      animation: 0
    };
    const labels = [];
    for (let i = 0; i <= iterations; i++)
      labels.push(i);
    let datasets = [];
    let i = 0;
    for (let key in result_0) {
      datasets.push({
        label: key,
        backgroundColor: colors[i % colors.length],
        borderColor: colors[i % colors.length],
        data: [result_0[key]]
      });
      i++;
    }
    const data = {
      labels: labels,
      datasets: datasets
    };
    const config = {
      type: 'line',
      data: data,
      options: chartjsOptions
    };
    let chart = Chart.getChart(chartCanvas);
    if (chart) chart.destroy();
    const ctx = chartCanvas.getContext('2d');
    chart = new Chart(ctx, config);
    return chart;
  }

  function updateChart(chart, from, to, series)
  {
    for (let result of series) {
      chart.data.datasets.forEach((dataset) => {
        dataset.data.push(result[dataset.label]);
      });
    }
    chart.update();
  }

  function showAgentInfo(event, model) {
    const rect = event.target.getBoundingClientRect();
    let x = event.clientX - rect.left; //x position within the element.
    let y = event.clientY - rect.top;  //y position within the element.
    for (const agent of model.agents) {
      if (x >= agent.left && x <= agent.right &&
          y >= agent.top && y <= agent.bottom) {
        alert("ID: " + agent.id + " Compartment: " + agent.compartment);
        break;
      }
    }
  }

  function drawAgent(ctx, x, y, radius, color)
  {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI*2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
  }

  function drawMacroPopulation(ctx, populationCanvas, model, colors) {
    const numAgents = EpiMacro.calcN(model.compartments);
    const width = populationCanvas.width;
    const height = populationCanvas.height;
    const area = width * height;
    const radius = Math.sqrt( area / (numAgents * 4 * Math.PI)  );
    const gap = 2 * radius;
    let x = 100000000, y = 0;
    let c = 0;
    let i = 0;
    let total = 0;

    for (const compartment in model.compartments) {
      let comp_size = model.compartments[compartment];
      if (comp_size < 0) {
        ctx.fillText("Compartment " + compartment + " below zero.", 15, 15);
        model.working.broken = true;
        return;
      }
      if (comp_size > MAX_POP) {
        ctx.fillText("Compartment " + compartment + " too large.", 15, 15);
        model.working.broken = true;
        return;
      }
      total += model.compartments[compartment];
      for (; i < total; i++) {
        x += gap + radius;
        if (x >= populationCanvas.width - gap) {
          x = gap;
          y += gap + radius;
        }
        drawAgent(ctx, x, y, radius, colors[c % colors.length]);
      }
      c++;
    }
  }

  function drawMicroPopulation(ctx, populationCanvas, model, colors) {
    const radius = model.working.radius;
    const width = populationCanvas.width;
    const height = populationCanvas.height;
    const widthRatio = populationCanvas.width / model.working.width;
    const heightRatio = populationCanvas.height / model.working.height;
    let rect = populationCanvas.getBoundingClientRect();

    for (const agent of model.agents) {
      const x = agent.x * widthRatio;
      const y = agent.y * heightRatio;
      agent.left = x - radius;
      agent.right = x + radius;
      agent.top = y - radius;
      agent.bottom = y + radius;
      drawAgent(ctx, x, y, radius,
                model.working.colorMap[agent.compartment]);
    }
  }

  function drawPopulation(populationCanvas, model) {
    const options = model.options || {}
    const ctx = populationCanvas.getContext('2d');
    const type = modelType(model);
    const colors = options.colors ||  EpiUI.THREE_COLORS;
    if ("broken" in model.working && model.working.broken === true) {
      ;
    } else {
      ctx.clearRect(0, 0, populationCanvas.width, populationCanvas.height);
      if (type === MACRO) {
        drawMacroPopulation(ctx, populationCanvas, model, colors);
      } else {
        drawMicroPopulation(ctx, populationCanvas, model, colors);
      }
    }
  }

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

  function printResult(tbody, rowNumber, result, decimals=2) {
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

  function initResults(resultsElem, options, series_0) {
    resultsElem.innerHTML = "";
    const decimals = options.decimals;
    let div = document.createElement("div");
    div.classList.add("epi-results-table-holder");
    let table = document.createElement("table");
    table.classList.add("epi-results-table");
    printHeader(table, series_0);
    let tbody = document.createElement("tbody");
    table.append(tbody);
    div.append(table);
    resultsElem.append(div);
    printResult(tbody, 0, series_0, decimals);
    return tbody;
  }

  function output(model, series, resultsTbody, chart, populationCanvas, from, to,
                  options={}) {
    for (let i = 0; i < series.length; i++) {
      printResult(resultsTbody, from + i + 1, series[i], options.decimals);
    }
    updateChart(chart, from, to, series);
    drawPopulation(populationCanvas, model, series[series.length - 1]);
  }

  function run(model, resultsDiv, chartCanvas, populationCanvas, speedInput) {
    function getSpeed(value) {
      return (100 - value) * 10;
    }
    const type = modelType(model);
    if (type === MICRO) {
      EpiMicro.runBeforeEvents(model);
      function _handler(event) {
        showAgentInfo(event, model);
      }
      if (populationCanvas.hasOwnProperty("_showAgentEvent")) {
        populationCanvas.removeEventListener('click',
                                             populationCanvas._showAgentEvent);
      }
      populationCanvas._showAgentEvent = _handler;
      populationCanvas.addEventListener('click', _handler);
    }

    const defaultIterations = 1000;
    const defaultUpdates = 10;

    const totalIterations = (model.parameters &&
                             model.parameters.iterations) ||
          defaultIterations;
    const iterationsPerUpdate = totalIterations /
          ( (model.parameters && model.parameters.updates) ||
            defaultUpdates);

    const options = model.options || {};

    EpiMacro.initializeModel(model);
    options.decimals = options.decimals || (modelType(model) == MICRO ? 0 : 2);
    let resultsTbody = initResults(resultsDiv, options, model.compartments);
    let chart = initChart(chartCanvas, totalIterations, options,
                          model.compartments);

    let compartments;
    if (modelType(model) === MACRO)
      compartments = model.compartments
    else
      compartments = undefined;
    drawPopulation(populationCanvas, model, compartments);

    let currentIteration = 0;
    setTimeout(updateLoop, getSpeed(speedInput.value));

    function updateLoop() {
      const from = currentIteration;
      const to = Math.min(currentIteration + iterationsPerUpdate,
                          totalIterations);
      let series;
      if (type === MACRO) {
        series = EpiMacro.iterateModel(model, to - from);
      } else {
        series = EpiMicro.iterateModel(model, to - from);
      }
      output(model, series, resultsTbody, chart, populationCanvas,
             from, to, options);
      currentIteration = to;
      if (currentIteration < totalIterations &&
          model.working.runStatus === "running") {
        setTimeout(updateLoop, getSpeed(speedInput.value));
      } else {
        model.working.runStatus = "stopped"
        model.working.runBtn.textContent = "Run";
        if (type === MICRO) {
          EpiMicro.runAfterEvents(model);
        }
      }
    }
  }

  function createDivs(model, div) {
    let heading = document.createElement('p');
    heading.innerHTML = model.name;
    heading.classList.add('model-heading');
    div.append(heading);
    let resultsDiv = document.createElement('div');
    resultsDiv.classList.add('epi-results');
    let chartDiv = document.createElement('div');
    chartDiv.classList.add('epi-chart');
    let chartCanvas = document.createElement('canvas');
    chartCanvas.classList.add('epi-chart-canvas');
    chartDiv.append(chartCanvas);
    let populationDiv = document.createElement('div');
    populationDiv.classList.add('epi-population');
    let populationCanvas = document.createElement('canvas');
    populationCanvas.classList.add('epi-population-canvas');
    populationDiv.append(populationCanvas);
    let parametersDiv = document.createElement('div');
    parametersDiv.classList.add('epi-parameters');
    div.append(resultsDiv);
    div.append(parametersDiv);
    div.append(chartDiv);
    div.append(populationDiv);
    const options = model.options || {};
    const rect = populationDiv.getBoundingClientRect();
    let runButtonDiv = document.createElement('div');
    runButtonDiv.classList.add('epi-run');
    div.append(runButtonDiv);
    let speedLabel = document.createElement("label");
    speedLabel.classList.add('epi-speed-label');
    speedLabel.textContent = "Slow";
    runButtonDiv.append(speedLabel);
    let speed = document.createElement("input");
    speed.type = "range";
    speed.value = 100;
    //speed.setAttribute("value", model.parameters.interval || "800");
    speed.classList.add('epi-speed');
    speed.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    speedLabel.setAttribute("for", speed.id);
    runButtonDiv.append(speed);
    let fast = document.createElement("span")
    fast.classList.add('epi-speed-label');
    fast.textContent = "Fast";
    runButtonDiv.append(fast);
    let runButton = document.createElement('button');
    runButton.textContent = "Run";
    runButton.classList.add('epi-run-btn');
    runButtonDiv.append(runButton);
    populationCanvas.height = options.parameters && options.parameters.height ||
      populationDiv.clientHeight - 45;
    populationCanvas.width = options.parameters && options.parameters.width ||
      populationDiv.clientWidth - 30;

    return [resultsDiv, chartDiv, populationDiv, parametersDiv, runButtonDiv];
  }

  function setParametersFromForm(model) {
    for (const parm of model.working.parameterTable) {
      const input = document.getElementById(parm.id);
      model[parm.group][parm.key] = parseFloat(input.value);
    }
  }

  function initParameters(parametersDiv, model, options) {
    let parameterTable = [];

    function initSingleParameter(parent, group, key, value) {
      let parameter = {};
      parameter.label = key;
      parameter.value = value;
      let form_group = document.createElement('div');
      form_group.classList.add('form-group');
      let label = document.createElement('label');
      label.textContent = parameter.label;
      if ("names" in model && key in model.names)
        label.innerHTML = model.names[key];
      else
        label.textContent = parameter.label;
      let input = document.createElement('input');
      const id = "epi-input-" + parameter.label +
            Math.random().toString(16).slice(2);
      label.htmlFor = id;
      input.id = id;
      input.setAttribute('value', parameter.value);
      input.type = "number";
      parameterTable.push({group: group, key: key, id: id});
      let help_text = document.createElement('p');
      help_text.classList.add('epi-help-text');
      if ("help" in model && key in model.help) {
        help_text.innerHTML = model.help[key];
      }
      form_group.append(label);
      form_group.append(input);
      form_group.append(help_text);
      parent.append(form_group);
    }

    let form = document.createElement("form");
    form.classList.add('epi-parameters-holder');
    parametersDiv.append(form);
    parametersDiv.classList.add('epi-hide-help');

    const parametersOptions = options.parametersOptions;
    const include = parametersOptions && parametersOptions.include;
    if (include === undefined || include === "all") {
      let div_compartments = document.createElement('div');
      div_compartments.classList.add('epi-parameter-compartments');
      form.append(div_compartments);
      for (const [key, value] of Object.entries(model.compartments))
        initSingleParameter(div_compartments, "compartments", key, value);
      let div_parameters = document.createElement('div');
      div_parameters.classList.add('epi-parameter-parameters');
      form.append(div_parameters);
      for (const [key, value] of Object.entries(model.parameters)) {
        if (key !== "interval")
          initSingleParameter(div_parameters, "parameters", key, value);
      }
    }
    let reset = document.createElement('button');
    reset.classList.add('epi-reset');
    reset.type = 'reset';
    reset.textContent = "Reset";
    form.append(reset);
    let help = document.createElement('button');
    help.classList.add('epi-help');
    help.type = 'button';
    help.textContent = "Help";
    form.append(help);
    model.working.parameterTable = parameterTable;
  }


  function create(model, div) {
    const [resultsDiv, chartDiv, populationDiv, parametersDiv, runButtonDiv] =
          createDivs(model, div);
    const chartCanvas = chartDiv.querySelector('canvas');
    if (model.hasOwnProperty("working") === false)
      model.working = {};
    initParameters(parametersDiv, model, model.options || {});
    let runBtn = runButtonDiv.querySelector('button');
    let speedInput = runButtonDiv.querySelector('input.epi-speed');
    let workingModel;
    runBtn.addEventListener('click', function() {
      // Reset canvas
      if (workingModel && workingModel.hasOwnProperty("working") &&
          workingModel.working.runStatus === "running") {
        workingModel.working.runStatus = "stopped";
        runBtn.textContent = "Run";
      } else {
        let chartCanvas = chartDiv.querySelector('canvas');
        let populationCanvas = populationDiv.querySelector('canvas');
        workingModel = EpiMacro.deepCopy(model);
        workingModel.working.runStatus = "running";
        workingModel.working.runBtn = runBtn;
        runBtn.textContent = "Stop";
        setParametersFromForm(workingModel);
        run(workingModel,resultsDiv, chartCanvas, populationCanvas, speedInput);
      }
    });
    let helpBtn = parametersDiv.querySelector('.epi-help');
    helpBtn.addEventListener('click', function() {
      if (parametersDiv.classList.contains('epi-hide-help')) {
        parametersDiv.classList.remove('epi-hide-help');
      } else {
        parametersDiv.classList.add('epi-hide-help');
      }
    });
    EpiUI.modelRegister[div.id] = model.name;
  }
  // Exports
  EpiUI.create = create;

} (window.EpiUI = window.EpiUI || {}));
