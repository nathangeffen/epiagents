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

function getSeries(R0, daysExposed, daysInfectious) {
  const N = 1000.0;
  const f = 1.0 / daysExposed;
  const r = 1.0 / daysInfectious;
  const beta = R0 / (N * daysInfectious);
  return rungeKutta(
    function(t, y) {
      return [-beta * y[0] * y[2],
              beta * y[0] * y[2] - f * y[1],
              f * y[1] - r * y[2],
              r * y[2]];
    },
    [N, 1.0, 0.0, 0.0], [0, 80], 0.1);
};


function generateSeries()
{
  let R0 = Math.floor(Math.random() * (9.5 - 2.0) + 2.0);
  let daysExposed = Math.floor(Math.random() * (10.0 - 2.0) + 2.0);
  let daysInfectious = Math.floor(Math.random() * (10.0 - 4.0) + 4.0);
  let series = getSeries(R0, daysExposed, daysInfectious);
  return {
    R0: R0,
    daysExposed: daysExposed,
    daysInfectious: daysInfectious,
    series: series
  };
}

function jiggleObservation(x, prop)
{
  const c = (Math.random() * prop * 2 * x) - prop * x;
  return Math.max(0.0, x + c);
}

function jiggleObservations(observations, prop)
{
  let series = [];
  for (const x of observations) {
    series.push(jiggleObservation(x, prop));
  }
  return series;
}

function getObservationsAndModel(R0, daysExposed, daysInfectious)
{
  const observationSeries = generateSeries();
  const observationInfections = [];
  for (const entry of observationSeries['series'])
    observationInfections.push(entry[1] + entry[2]);
  const observations = jiggleObservations(observationInfections, 0.05);
  const modelSeries = getSeries(R0, daysExposed, daysInfectious);
  const modelInfections = [];
  const observationFinal = [];

  for (let i = 0; i < modelSeries.length; i++) {
    if (i % 10 == 0) {
      modelInfections.push(modelSeries[i][1] + modelSeries[i][2]);
      observationFinal.push(observations[i]);
    }
  }

  return {
    'observationParameters': observationSeries,
    'observations': observationFinal,
    'modelParameters': {
      R0: R0,
      daysExposed: daysExposed,
      daysInfectious: daysInfectious,
      series: modelSeries
    },
    'model': modelInfections
  };
}


function makeCalibrationGraph()
{
  const R0 = 4.0;
  const DaysExposed = 2.0;
  const DaysInfectious = 5.0;
  const data = getObservationsAndModel(R0, DaysExposed, DaysInfectious);
  let labels = [];
  for (let i =0; i < data['model'].length; i++) {
    labels.push(i);
  }
  const ctx = document.getElementById('calibration-chart');

  let calibrationChart = new Chart(ctx, {
    data: {
      type: 'line',
      labels: labels,
      datasets: [
        {
          label: 'Observed',
          data: data['observations'],
          borderWidth: 1,
          type: 'line'
        },
        {
          label: 'Model',
          data: data['model'],
          borderWidth: 1,
          type: 'line'
        },
      ]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
  return [calibrationChart, data];
}

function meanSquaredError(Y1, Y2)
{
  let total = 0.0;
  let n = Y1.length;
  for (let i = 0; i < n; i++) {
    const d = Y1[i] - Y2[i];
    total += d * d;
  }
  return total / n;
}

function maxSquaredError(observed)
{
  let zeros = [];
  for (const _ of observed) zeros.push(0);
  const maxError = meanSquaredError(observed, zeros);
  return [0.01 * maxError, 0.1 * maxError, maxError]
}

function checkIfMatch(observed, model)
{
  const mse = meanSquaredError(observed, model).toFixed(2);

  const [small, medium, _] = maxSquaredError(observed);

  if (mse < small) {
    document.getElementById('calibration-alert').textContent =
      "Model is calibrated! MSE: " + mse;
    document.getElementById('calibration-alert').classList.
      add('calibration-success');
  } else {
    document.getElementById('calibration-alert').classList.
      remove('calibration-success');
    if (mse < medium) {
      document.getElementById('calibration-alert').textContent =
        "Model is almost calibrated. MSE: " + mse;
    } else {
      document.getElementById('calibration-alert').textContent =
        "Model is not calibrated. MSE: " + mse;
    }
  }
}

function updateCalibrationChart(chart, data)
{
  const R0 =  document.getElementById('calibration-graph-R0').value;
  const daysExposed = document.getElementById('calibration-graph-days-exposed').
        value;
  const daysInfectious =  document.
        getElementById('calibration-graph-days-infectious').value;
  const modelSeries = getSeries(R0, daysExposed, daysInfectious);
  const modelInfections = [];

  for (let i = 0; i < modelSeries.length; i++) {
    if (i % 10 == 0)
      modelInfections.push(modelSeries[i][1] + modelSeries[i][2]);
  }
  chart.data.datasets[1].data = modelInfections;
  chart.update();
  checkIfMatch(data['observations'], modelInfections);
}

function setupCalibration()
{
  let [chart, data] = makeCalibrationGraph();
  checkIfMatch(data['observations'], data['model']);
  document.getElementById('calibration-graph-R0').
    addEventListener('click', function(e) {
      document.getElementById('calibration-graph-R0-value').textContent =
        e.target.value;
      updateCalibrationChart(chart, data);
    });
  document.getElementById('calibration-graph-days-exposed').
    addEventListener('click', function(e) {
      document.getElementById('calibration-graph-days-exposed-value').textContent =
        e.target.value;
      updateCalibrationChart(chart, data);
    });
  document.getElementById('calibration-graph-days-infectious').
    addEventListener('click', function(e) {
      document.getElementById('calibration-graph-days-infectious-value').
        textContent = e.target.value;
      updateCalibrationChart(chart, data);
    });
}

setupCalibration();
