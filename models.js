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


const HELP = {
  'S': 'Susceptible',
  'E': 'Exposed (infected) but not yet infectious',
  'I': 'Infectious',
  'R': 'Recovered',
  'R0': `Average number of people infected by a single infectious individual in
  naive population`,
  'D': 'Average number of days that an individual is infectious',
  'iterations': 'Number of times the model executes',
  'updates': 'Number of iterations that are executed before the GUI is updated',
  'r': 'Specifies probability of infectious agent being spontaneously created'
};

const NAMES = {
  R0: "<i><u>R</u><sub>0</sub></i>",
  E_I: "days exposed",
  I_R: "days infectious",
  r: "Random infection",
  updates: 'Updates',
  iterations: 'Iterations',
};

/* Macro models */

const macroSIR = {
  name: "SIR macro model using difference equations",
  compartments: {
    'S': 999,
    'I': 1,
    'R': 0
  },
  parameters: {
    R0: 2.0,
    D: 5.0,
    iterations: 100,
    updates: 10,
  },
  names: NAMES,
  help: HELP,
  initialize: [
    function(model) {
      model.working.beta = model.parameters.R0 /
        (EpiMacro.calcN(model.compartments) * model.parameters.D);
      model.working.r = 1.0 / model.parameters.D;
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

EpiUI.create(macroSIR, document.getElementById('macroSIR'));

let macroSIROde = EpiMacro.deepCopy(macroSIR);
macroSIROde.name = "SIR macro model using differential equation"
macroSIROde.ode = function(model) {
  return function(t, y) {
    return [-model.working.beta * y[0] * y[1],
            (model.working.beta * y[0] - model.working.r) * y[1],
            model.working.r * y[1]];
  };
}

EpiUI.create(macroSIROde, document.getElementById('macroSIROde'));

let macroSIR100 = EpiMacro.deepCopy(macroSIR);
macroSIR100.compartments.S = 900;
macroSIR100.compartments.I = 100;
macroSIR100.name = "Macro model: SIR with 100 initial infections";
EpiUI.create(macroSIR100, document.getElementById('macroSIR100'));

const macroSEIR = {
  name: "SEIR macro model using difference equations",
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
    updates: 10,
  },
  names: NAMES,
  help: HELP,
  initialize: [
    function(model) {
      model.working.beta = model.parameters.R0 /
        (EpiMacro.calcN(model.compartments) * model.parameters.I_R);

      model.working.f = 1.0 / model.parameters.E_I;
      model.working.r = 1.0 / model.parameters.I_R;
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
    colors: EpiUI.FOUR_COLORS
  }
};

EpiUI.create(macroSEIR, document.getElementById('macroSEIR'));

let macroSEIROde = EpiMacro.deepCopy(macroSEIR);
macroSEIROde.name = "SEIR macro model using differential equation"
macroSEIROde.ode = function(model) {
  return function(t, y) {
    return [-model.working.beta * y[0] * y[2],
            model.working.beta * y[0] * y[2] - model.working.f * y[1],
            model.working.f * y[1] - model.working.r * y[2],
            model.working.r * y[2]];
  };
}

EpiUI.create(macroSEIROde, document.getElementById('macroSEIROde'));

// Based on slides by Brian Williams at
// http://www.ici3d.org/DAIDD2016/Materials/Brian%20Williams%20What%20is%20Science.pdf
// (see p. 36), which is based on Fine, P. and Clarkson, J.A. (1982)
// Here the timestep is two weeks
const macroMeasles = {
  name: "Measles macro model using difference equations",
  compartments: {
    'S': 990,
    'I': 10,
    'R': 0,
  },
  parameters: {
    R0: 2,
    β: 0.0092,
    iterations: 415,
    updates: 5,
  },
  names: NAMES,
  help: HELP,
  initialize: [
    function(model) {
      model.working.N = model.compartments.S + model.compartments.I +
        model.compartments.R;
      model.working.growth = model.parameters.β * model.working.N;
    }
  ],
  transitions: [
    // I
    function(model) {
      model.working.I = model.parameters.R0 * model.compartments.I *
        (model.compartments.S / model.working.N);
      if (model.compartments.S + model.working.growth - model.working.I  < 0)
        model.working.I = model.compartments.S;
      return {
        'from': '*',
        'to': 'I',
        'value': model.working.I
      };
    },
    // R
    function(model) {
      model.working.iterationGrowth = model.working.growth;
      if ( (-(model.compartments.I - model.working.growth)) >
           model.compartments.R) {
        model.working.iterationGrowth = model.compartments.R +
          model.compartments.I;
      }
      const R = model.compartments.I - model.working.iterationGrowth;
      return {
        'from': '_',
        'to': 'R',
        'value': R
      };
    },
    // S
    function(model) {
      const S =  -model.working.I + model.working.iterationGrowth;
      return {
        'from': '_',
        'to': 'S',
        'value': S
      };
    }

  ],
  options: {
    colors: EpiUI.THREE_COLORS
  }
};

EpiUI.create(macroMeasles, document.getElementById('macroMeasles'));


const macroGranichEtAlColors = [
  'green',
  '#FF0000', '#EE0000', '#DD0000', '#CC0000',
  '#0000FF', '#0000EE', '#0000DD', '#0000CC',
  '#000000', "darkred"
];

// Tally infections for UI purposes only
function tallyInfections(model) {
  const value = model.compartments.I1 + model.compartments.I2 +
        model.compartments.I3 + model.compartments.I4 +
        model.compartments.A1 + model.compartments.A2 +
        model.compartments.A3 + model.compartments.A4 -
        model.compartments.I;
  return {
    "from": "_",
    "to": "I",
    "value": value
  }
}

const macroGranichEtAl = {
  name: "Macro model implementation of Granich et al.",
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
    D: 0,
    I: 100
  },
  parameters: {
    β: 0.009,
    μ: 0.0045,
    ρ: 0.12,
    τ: 0.3,
    φ: 0.005,
    σ: 0.006,
    λ0: 0.08,
    α: 1.0,
    n: 1.0,
    ε: 0.0001,
    iterations: 50,
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
                                model.parameters.ρ);
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
                                model.parameters.σ);
    },
    // A4->I4
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'A4', 'I4',
                                model.parameters.φ);
    },
    tallyInfections
  ],
  options: {
    colors: macroGranichEtAlColors
  }
};

EpiUI.create(macroGranichEtAl, document.getElementById('macroGranichEtAl'));

const macroCovid = {
  name: "Covid macro model",
  compartments: {
    S: 999,
    E: 1,
    Ia: 0,
    Is: 0,
    Ih: 0,
    Ii: 0,
    R: 0,
    V: 0,
    D: 0,
  },
  parameters: {
    c_e: 0.5,

    S_V: 0.05,

    E_Ia: 0.5,

    Ia_Is: 0.2,
    Ia_R: 0.2,

    Is_Ih: 0.03,
    Is_R: 0.25,

    Ih_Ii: 0.15,
    Ih_R: 0.3,

    Ii_D: 0.2,
    Ii_R: 0.1,

    V_S: 0.002,

    R_S: 0.002,

    Inf_Ia: 0.5,
    Inf_Is: 1.0,
    Inf_Ih: 0.5,
    Inf_Ii: 0.5,

    iterations: 370,
    updates: 10
  },
  initialize: [
    function(model) {
      const N = EpiMacro.calcN(model.compartments, ['D']);
      model.working.β = model.parameters.c_e / N;
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

    // S->V
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'S', 'V',
                                model.parameters.S_V);
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

    // V_S
    function(model) {
      return EpiMacro.delta_X_Y(model.compartments, 'V', 'S',
                                model.parameters.V_S);
    },

  ],
  options: {
    colors: EpiUI.NINE_COLORS
  }
};

EpiUI.create(macroCovid, document.getElementById('macroCovid'));

/* Micro models */

const microSIR = {
  name: "SIR micro model",
  compartments: {
    'S': 999,
    'I': 1,
    'R': 0,
  },
  parameters: {
    R0: 2.0,
    D: 5.0,
    iterations: 100,
    updates: 10,
  },
  names: NAMES,
  beforeEvents: [
    EpiMicro.eventCreateAgents, EpiMicro.eventSetAgentIds,
    EpiMicro.eventSetAgentCompartments, EpiMicro.eventSetCompartmentColors,
    EpiMicro.eventSetAgentPositions,
    function(model) {
      model.working.beta = model.parameters.R0 /
        (model.agents.length * model.parameters.D);
      model.working.r = 1.0 / model.parameters.D;
    }
  ],

  duringEvents: [
    EpiMicro.eventShuffle,
    function(model) {
      return EpiMicro.eventStoI(model, 'S', 'I', model.working.beta, ['I']);
    },
    function(model) {
      EpiMicro.eventFromToRisk(model, 'I', 'R', model.working.r);
    },
    EpiMicro.eventResetChanged,
    EpiMicro.eventTallyCompartments
  ],

  afterEvents: [],
  options: {
    colors: EpiUI.THREE_COLORS
  }
};

EpiUI.create(microSIR, document.getElementById('microSIR'));

let microSIR100 = EpiMacro.deepCopy(microSIR);
microSIR100.compartments.S = 900;
microSIR100.compartments.I = 100;
microSIR100.name = "SIR micro model with 100 initial infections";
EpiUI.create(microSIR100, document.getElementById('microSIR100'));

const microSEIR = {
  name: "SEIR micro model",
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
    updates: 10,
  },
  names: NAMES,
  beforeEvents: [
    EpiMicro.eventCreateAgents, EpiMicro.eventSetAgentIds,
    EpiMicro.eventSetAgentCompartments, EpiMicro.eventSetCompartmentColors,
    EpiMicro.eventSetAgentPositions,
    function(model) {
      model.working.beta = model.parameters.R0 /
        (model.agents.length * model.parameters.I_R);
      model.working.f = 1.0 / model.parameters.E_I;
      model.working.r = 1.0 / model.parameters.I_R;
    }
  ],

  duringEvents: [
    EpiMicro.eventShuffle,
    function(model) {
      return EpiMicro.eventStoI(model, 'S', 'E', model.working.beta, ['I']);
    },
    function(model) {
      EpiMicro.eventFromToRisk(model, 'E', 'I', model.working.f);
    },
    function(model) {
      EpiMicro.eventFromToRisk(model, 'I', 'R', model.working.r);
    },
    EpiMicro.eventResetChanged,
    EpiMicro.eventTallyCompartments
  ],

  afterEvents: [],

  options: {
    colors: EpiUI.FOUR_COLORS
  }
};

EpiUI.create(microSEIR, document.getElementById('microSEIR'));


const microMeasles = {
  name: "Measles micro model",
  compartments: {
    'S': 990,
    'I': 10,
    'R': 0
  },
  parameters: {
    R0: 2,
    β: 0.0092,
    r: 0.0,
    iterations: 415,
    updates: 5,
  },
  names: NAMES,
  beforeEvents: [
    EpiMicro.eventCreateAgents, EpiMicro.eventSetAgentIds,
    EpiMicro.eventSetAgentCompartments, EpiMicro.eventSetCompartmentColors,
    EpiMicro.eventSetAgentPositions,
    function(model) {
      model.working.N = model.compartments.S + model.compartments.I +
        model.compartments.R;
      model.working.growth = Math.round(model.parameters.β * model.working.N);
    }
  ],

  duringEvents: [
    EpiMicro.eventShuffle,
    // If no I set first agent to I. This is random because of shuffle.
    function(model) {
      if (model.compartments.I == 0) {
        if (Math.random() < model.parameters.r)
          model.agents[0].compartment = "I";
      }
    },
    // I
    function(model) {
      let risk = model.parameters.R0 * model.compartments.I *
        (model.compartments.S / model.working.N) / model.working.N;
      EpiMicro.eventFromToRisk(model, 'S', 'I', risk);
    },
    // R
    function(model) {
      let i = 0;
      console.log("I", model.compartments.I);
      for (let agent of model.agents) {
        if (i >= model.compartments.I) break;
        if (agent.compartment === "I") {
          agent.compartment = "R";
          i++;
          console.log("R!");
        }
      }
    },
    // S
    function(model) {
      let i = 0;
      console.log("G", model.working.growth);
      for (let agent of model.agents) {
        if (i >= model.working.growth) break;
        if (agent.compartment === "R") {
          agent.compartment = "S";
          i++;
          console.log("S");
        }
      }
    },
    EpiMicro.eventResetChanged,
    EpiMicro.eventTallyCompartments
  ],

  afterEvents: [],

  options: {
    colors: EpiUI.THREE_COLORS
  }
};

EpiUI.create(microMeasles, document.getElementById('microMeasles'));



const microGranichEtAl = {
  name: "Micro model implementation of Granich et al.",
  compartments: EpiMacro.deepCopy(macroGranichEtAl.compartments),
  parameters: EpiMacro.deepCopy(macroGranichEtAl.parameters),
  beforeEvents: [
    EpiMicro.eventCreateAgents, EpiMicro.eventSetAgentIds,
    EpiMicro.eventSetAgentCompartments, EpiMicro.eventSetCompartmentColors,
    EpiMicro.eventSetAgentPositions
  ],
  duringEvents: [
    EpiMicro.eventShuffle,
    // _->S
    function(model) {
      let n = model.agents.length;
      for (let i = 0; i < n; i++) {
        if (model.agents[i].compartment !== 'D') {
          if (Math.random() < model.parameters.β) {
            model.agents.push({
              'compartment': 'S',
              'changed': true
            });
          }
        }
      }
    },
    // S->D
    function(model) {
      EpiMicro.eventFromToRisk(model, 'S', 'D', model.parameters.μ)
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
      const risk = λ * J / N;
      EpiMicro.eventFromToRisk(model, 'S', 'I1', risk);
    },
    // I1->D
    function(model) {
      EpiMicro.eventFromToRisk(model, 'I1', 'D', model.parameters.μ)
    },
    // I1->I2
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'I1', 'I2',
                                model.parameters.ρ);
    },
    // I1->A1
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'I1', 'A1',
                                model.parameters.τ);
    },
    // I2->D
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'I2', 'D',
                                model.parameters.μ);
    },
    // I2->I3
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'I2', 'I3',
                                model.parameters.ρ);
    },
    // I2->A2
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'I2', 'A2',
                                model.parameters.τ);
    },
    // I3->D
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'I3', 'D',
                                model.parameters.μ);
    },
    // I3->I4
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'I3', 'I4',
                                model.parameters.ρ);
    },
    // I3->A3
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'I3', 'A3',
                                model.parameters.τ);
    },
    // I4->D
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'I4', 'D',
                                model.parameters.ρ);
    },
    // I4->A4
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'I4', 'A4',
                                model.parameters.τ);
    },

    // A1->D
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'A1', 'D',
                                model.parameters.μ);
    },
    // A1->A2
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'A1', 'A2',
                                model.parameters.σ);
    },
    // A1->I1
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'A1', 'I1',
                                model.parameters.φ);
    },

    // A2->D
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'A2', 'D',
                                model.parameters.μ);
    },
    // A1->A2
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'A2', 'A3',
                                model.parameters.σ);
    },
    // A2->I2
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'A2', 'I2',
                                model.parameters.φ);
    },

    // A3->D
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'A3', 'D',
                                model.parameters.μ);
    },
    // A3->A4
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'A3', 'A4',
                                model.parameters.σ);
    },
    // A3->I3
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'A3', 'I3',
                                model.parameters.φ);
    },

    // A4->D
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'A4', 'D',
                                model.parameters.σ);
    },
    // A4->I4
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'A4', 'I4',
                                      model.parameters.φ);
    },
    EpiMicro.eventResetChanged,
    EpiMicro.eventTallyCompartments,
    function(model) {
      model.compartments.I =
        model.compartments.I1 + model.compartments.I2 +
        model.compartments.I3 + model.compartments.I4 +
        model.compartments.A1 + model.compartments.A2 +
        model.compartments.A3 + model.compartments.A4;
    }
  ],
  options: {
    colors: macroGranichEtAlColors
  }
};

EpiUI.create(microGranichEtAl, document.getElementById('microGranichEtAl'));

const microCovid = {
  name: "Covid micro model",
  compartments: {
    S: 999,
    E: 1,
    Ia: 0,
    Is: 0,
    Ih: 0,
    Ii: 0,
    R: 0,
    V: 0,
    D: 0,
  },
  parameters: {
    c_e: 0.5,

    S_V: 0.05,

    E_Ia: 0.5,

    Ia_Is: 0.2,
    Ia_R: 0.2,

    Is_Ih: 0.03,
    Is_R: 0.25,

    Ih_Ii: 0.15,
    Ih_R: 0.3,

    Ii_D: 0.2,
    Ii_R: 0.1,

    V_S: 0.002,

    R_S: 0.002,

    Inf_Ia: 0.5,
    Inf_Is: 1.0,
    Inf_Ih: 0.5,
    Inf_Ii: 0.5,
    iterations: 370,
    updates: 10
  },
  beforeEvents: [
    EpiMicro.eventCreateAgents, EpiMicro.eventSetAgentIds,
    EpiMicro.eventSetAgentCompartments, EpiMicro.eventSetCompartmentColors,
    EpiMicro.eventSetAgentPositions,
    function(model) {
      const N = EpiMacro.calcN(model.compartments, ['D']);
      model.working.β = model.parameters.c_e / N;
    }
  ],
  duringEvents: [
    EpiMicro.eventShuffle,
    // S->E
    function(model) {
      EpiMicro.eventTallyCompartments(model);
      const I =
            model.parameters.Inf_Ia * model.compartments.Ia +
            model.parameters.Inf_Is * model.compartments.Is +
            model.parameters.Inf_Ih * model.compartments.Ih +
            model.parameters.Inf_Ii * model.compartments.Ii;
      const λt = model.working.β * I;
      for (let agent of model.agents) {
        if (agent.compartment === 'S' && Math.random() < λt) {
          agent.compartment = 'E';
        }
      }
    },
    // S->V
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'S', 'V',
                                      model.parameters.S_V);
    },

    // E->Ia
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'E', 'Ia',
                                      model.parameters.E_Ia);
    },

    // Ia_Is
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'Ia', 'Is',
                                      model.parameters.Ia_Is);
    },
    // Ia_R
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'Ia', 'R',
                                      model.parameters.Ia_R);
    },

    // Is_Ih
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'Is', 'Ih',
                                      model.parameters.Is_Ih);
    },
    // Is_R
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'Is', 'R',
                                      model.parameters.Is_R);
    },

    // Ih_Ii
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'Ih', 'Ii',
                                      model.parameters.Ih_Ii);
    },
    // Ih_i_R
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'Ih', 'R',
                                      model.parameters.Ih_R);
    },

    // Ii_R
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'Ii', 'R',
                                      model.parameters.Ii_R);
    },
    // Ih_i_R
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'Ii', 'D',
                                      model.parameters.Ii_D);
    },

    // R_S
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'R', 'S',
                                      model.parameters.R_S);
    },

    // V_S
    function(model) {
      return EpiMicro.eventFromToRisk(model, 'V', 'S',
                                      model.parameters.V_S);
    },
    EpiMicro.eventTallyCompartments,
  ],
  options: {
    colors: EpiUI.NINE_COLORS
  }
};

EpiUI.create(microCovid, document.getElementById('microCovid'));

// rungeKutta test
// Setup parameters for the transmission speed (T)
// and the recovery rate R (R).
// R0 = ~ T/R.
// const T = 2, R = 1;
// Define the set of ordinary differential equations.
// const dSIR = (t, y) => [-T * y[0] * y[1], (T * y[0] - R) * y[1], R * y[1]];

// Solve the system and log the result (reduced to the infection count).
//console.log(rungeKutta(dSIR, [1, .01, 0], [0, 100], 1));
