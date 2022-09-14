"use strict";

const macroSIR = {
  compartments: {
    'S': 999,
    'I': 1,
    'R': 0
  },
  parameters: {
    R0: 2.0,
    D: 5.0,
    iterations: 100,
    interval: 0,
    updates: 10,
  },
  transitions: [
    // S->I
    function(model) {
      const N = EpiMacro.calcN(model.compartments);
      const beta = model.parameters.R0 / (N * model.parameters.D);
      let S_I = EpiMacro.delta_S_I(model.compartments, 'S', 'I', beta);
      return S_I;
    },
    // I->R
    function(model) {
      const r = 1.0 / model.parameters.D;
      return EpiMacro.delta_X_Y(model.compartments, 'I', 'R', r);
    }
  ]
};

EpiMacroUI.create(macroSIR, document.getElementById('macroSIR'));

/* EpiMacroUI.run(exampleMacroModel, document.getElementById('macro-basic'));

 * let div = document.getElementById("vaccine-strategy-1");
 * let sim_1 = EpiAgentsUI.create("vaccine-strategy-1", {
 *     name: "Test model",
 *     description: "Model used for testing EpiAgents",
 *     numAgents: 1000,
 *     interval: 10
 * });
 * sim_1.clear();

 * sim_1.setInitialRatios([
 *     ["SUSCEPTIBLE", 990],
 *     ["INFECTED_EXPOSED", 10]
 * ]);

 * sim_1.setInfectiousness("INFECTED_SYMPTOMATIC", 1.0);

 * sim_1.setTransitions([
 *     ["INFECTED_EXPOSED", "INFECTED_SYMPTOMATIC", 1.0],
 *     ["INFECTED_SYMPTOMATIC", "RECOVERED", 0.01],
 *     ["RECOVERED", "SUSCEPTIBLE", 0.0]
 * ]);
 * sim_1.init();
 * let sim_2 = EpiAgentsUI.create("vaccine-strategy-2", {
 *     name: "Test model 2",
 *     description: "Model 2 used for testing EpiAgents",
 *     numAgents: 500,
 *     interval: 200,
 *     movementRandomnessMean: 0.1,
 *     elasticCollisions: false
 * });
 * sim_2.init();

 * let sim_3 = EpiAgentsUI.create("vaccine-strategy-3", {
 *     name: "Test model 3",
 *     description: "Model used for testing EpiAgents",
 *     width: 400,
 *     height: 400,
 *     clusters: [
 *         {
 *             name: "A",
 *             left: 0,
 *             top: 0,
 *             right: 240,
 *             bottom: 240,
 *             border: true,
 *             borderColor: "yellow",
 *             numAgents: 10
 *         },
 *         {
 *             name: "B",
 *             left: 160,
 *             top: 160,
 *             right: 400,
 *             bottom: 400,
 *             border: true,
 *             borderColor: "red",
 *             numAgents: 20
 *         },
 *     ]
 * });
 * sim_3.init(); */
