"use strict";

const macroSIR = {
  name: "Macro model: SIR",
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
  names: {
    R0: "<i><u>R</u><sub>0</sub></i>",
  },
  initialize: [
    function(model) {
      model['working'] = {};
      model['working']['beta'] = model.parameters.R0 /
        (EpiMacro.calcN(model.compartments) * model.parameters.D);
      model['working']['r'] = 1.0 / model.parameters.D;
    }
  ],
  transitions: [
    // S->I
    function(model) {
      return EpiMacro.delta_S_I(model.compartments, 'S', 'I',
                                  model.working.beta);
    },
    // I->R
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'I', 'R',
                                model.working.r);
    }
  ]
};

EpiMacroUI.create(macroSIR, document.getElementById('macroSIR'));

const macroSEIR = {
  name: "Macro model: SEIR",
  compartments: {
    'S': 999,
    'E': 1,
    'I': 0,
    'R': 0
  },
  parameters: {
    R0: 2.0,
    E_I: 2.0,
    I_R: 5.0,
    iterations: 100,
    interval: 0,
    updates: 10,
  },
  names: {
    E_I: "days exposed",
    I_R: "days infectious",
    R0: "<i><u>R</u><sub>0</sub></i>",
  },
  initialize: [
    function(model) {
      model['working'] = {};
      model['working']['beta'] = model.parameters.R0 /
        (EpiMacro.calcN(model.compartments) * model.parameters.I_R);

      model['working']['f'] = 1.0 / model.parameters.E_I;
      model['working']['r'] = 1.0 / model.parameters.I_R;
    }
  ],
  transitions: [
    // S->E
    function(model) {
      return EpiMacro.delta_S_I(model.compartments, 'S', 'E',
                                model.working.beta, ['I']);
    },
    // E->I
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'E', 'I',
                                  model.working.f);
    },
    // I->R
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'I', 'R',
                                model.working.r);
    }
  ],
  options: {
    colors: EpiMacroUI.FOUR_COLORS
  }
};


EpiMacroUI.create(macroSEIR, document.getElementById('macroSEIR'));

const macroGranichEtAlColors = [
  'green',
  '#FF0000', '#EE0000', '#DD0000', '#CC0000',
  '#0000FF', '#0000EE', '#0000DD', '#0000CC',
  '#000000'
];
const macroGranichEtAl = {
  name: "Macro model: Granich et al.",
  compartments: {
    S: 900,
    I1: 25,
    I2: 25,
    I3: 25,
    I4: 25,
    A1: 0,
    A2: 0,
    A3: 0,
    A4: 0,
    D: 0
  },
  parameters: {
    β: 0.009,
    μ: 0.0045,
    ρ: 0.12,
    τ: 0.10,
    φ: 0.005,
    σ: 0.006,
    λ0: 0.08,
    α: 1.0,
    n: 1.0,
    ε: 0.0001,
    iterations: 100,
    interval: 0,
    updates: 10
  },
  transitions: [
    // _->S
    function(model) {
      const N = EpiMacro.calcN(model.compartments, ['D']);
      return {
        'from': '_',
        'to': 'S',
        'value': model.parameters.β * N
      }
    },
    // S->D
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'S', 'D',
                                model.parameters.μ);
    },
    // S->I1
    function(model) {
      const I =
            model.compartments.I1 +
            model.compartments.I2 +
            model.compartments.I3 +
            model.compartments.I4;
      const A =
            model.compartments.A1 +
            model.compartments.A2 +
            model.compartments.A3 +
            model.compartments.A4;
      const J = I + model.parameters.ε * A;
      const N = EpiMacro.calcN(model.compartments, ['D']);
      const P = 1.0 / N;
      const λ = model.parameters.λ0 * Math.exp(
        -model.parameters.α * Math.pow(P, model.parameters.n));

      const value = λ * model.compartments.S * J / N;
      return {
        'from': 'S',
        'to': 'I1',
        'value': value
      };
    },
    // I1->D
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'I1', 'D',
                                model.parameters.μ);
    },
    // I1->I2
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'I1', 'I2',
                                model.parameters.ρ);
    },
    // I1->A1
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'I1', 'A1',
                                model.parameters.τ);
    },
    // I2->D
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'I2', 'D',
                                model.parameters.μ);
    },
    // I2->I3
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'I2', 'I3',
                                model.parameters.ρ);
    },
    // I2->A2
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'I2', 'A2',
                                model.parameters.τ);
    },
    // I3->D
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'I3', 'D',
                                model.parameters.μ);
    },
    // I3->I4
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'I3', 'I4',
                                model.parameters.ρ);
    },
    // I3->A3
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'I3', 'A3',
                                model.parameters.τ);
    },
    // I4->D
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'I4', 'D',
                                model.parameters.μ);
    },
    // I4->A4
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'I4', 'A4',
                                model.parameters.τ);
    },

    // A1->D
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'A1', 'D',
                                model.parameters.μ);
    },
    // A1->A2
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'A1', 'A2',
                                model.parameters.σ);
    },
    // A1->I1
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'A1', 'I1',
                                model.parameters.φ);
    },

    // A2->D
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'A2', 'D',
                                model.parameters.μ);
    },
    // A1->A2
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'A2', 'A3',
                                model.parameters.σ);
    },
    // A2->I2
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'A2', 'I2',
                                model.parameters.φ);
    },

    // A3->D
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'A3', 'D',
                                model.parameters.μ);
    },
    // A3->A4
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'A3', 'A4',
                                model.parameters.σ);
    },
    // A3->I3
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'A3', 'I3',
                                model.parameters.φ);
    },

    // A4->D
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'A4', 'D',
                                model.parameters.μ);
    },
    // A4->I4
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'A3', 'I3',
                                model.parameters.φ);
    },
  ],
  options: {
    colors: macroGranichEtAlColors
  }
};

EpiMacroUI.create(macroGranichEtAl, document.getElementById('macroGranichEtAl'));

const macroCovid = {
  name: "Macro: Covid",
  compartments: {
    S: 999,
    E: 1,
    Ia: 0,
    Is: 0,
    Ih: 0,
    Ii: 0,
    R: 0,
    D: 0,
  },
  parameters: {
    c_e: 0.5,

    E_Ia: 0.5,

    Ia_Is: 0.2,
    Ia_R: 0.2,

    Is_Ih: 0.03,
    Is_R: 0.25,

    Ih_Ii: 0.15,
    Ih_R: 0.3,

    Ii_D: 0.2,
    Ii_R: 0.1,

    R_S: 0.000,

    Inf_Ia: 0.5,
    Inf_Is: 1.0,
    Inf_Ih: 0.5,
    Inf_Ii: 0.5,

    iterations: 365,
    interval: 0,
    updates: 10
  },
  initialize: [
    function(model) {
      const N = EpiMacro.calcN(model.compartments, ['D']);
      model['working'] = {};
      model['working']['β'] = model.parameters.c_e / N;
    }
  ],
  transitions: [
    // S->E
    function(model) {
      const I =
            model.parameters.Inf_Ia * model.compartments.Ia +
            model.parameters.Inf_Is * model.compartments.Is +
            model.parameters.Inf_Ih * model.compartments.Ih +
            model.parameters.Inf_Ii * model.compartments.Ii;
      const λt = model.working.β * I;
      const change = λt * model.compartments.S;
      return {
        'from': 'S',
        'to': 'E',
        'value': change
      };
    },
    // E->Ia
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'E', 'Ia',
                                model.parameters.E_Ia);
    },

    // Ia_Is
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'Ia', 'Is',
                                model.parameters.Ia_Is);
    },
    // Ia_R
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'Ia', 'R',
                                model.parameters.Ia_R);
    },

    // Is_Ih
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'Is', 'Ih',
                                   model.parameters.Is_Ih);
    },
    // Is_R
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'Is', 'R',
                                model.parameters.Is_R);
    },

    // Ih_Ii
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'Ih', 'Ii',
                                model.parameters.Ih_Ii);
    },
    // Ih_i_R
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'Ih', 'R',
                                model.parameters.Ih_R);
    },

    // Ii_R
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'Ii', 'R',
                                model.parameters.Ii_R);
    },
    // Ih_i_R
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'Ii', 'D',
                                model.parameters.Ii_D);
    },

    // R_S
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'R', 'S',
                                model.parameters.R_S);
    },

  ],
  options: {
    colors: EpiMacroUI.EIGHT_COLORS
  }
};

EpiMacroUI.create(macroCovid, document.getElementById('macroCovid'));


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
