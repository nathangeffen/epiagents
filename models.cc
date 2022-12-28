#include <cstdio>
#include <cfloat>
#include <algorithm>
#include <chrono>
#include <map>
#include <random>
#include <string>
#include <vector>

typedef std::map<std::string, double> CompartmentMap;
typedef std::map<std::string, double> ParameterMap;
typedef std::vector<CompartmentMap> TimeSeries;

struct Agent {
    int id;
    int changed = -1;
    std::string compartment;
};

typedef std::vector<Agent> AgentVector;

double calcN(const CompartmentMap & compartments)
{
    double total = 0;
    for (auto & c: compartments)
        total += c.second;
    return total;
}

TimeSeries macroSIR(const CompartmentMap & compartments,
                    const ParameterMap & parameters)
{
    TimeSeries results;
    double beta = parameters.at("R0") /
        (calcN(compartments) * parameters.at("D"));
    double r = 1.0 / parameters.at("D");
    int n = parameters.at("iterations");

    results.push_back(compartments);

    for (int i = 1; i <= n; i++) {
        results.push_back(results[i - 1]);
        // S -> I
        const double delta = beta * results[i].at("I");
        const double S_I = delta * results[i].at("S");
        // I -> R
        const double I_R = r * results[i].at("I");

        results[i]["S"] -= S_I;
        results[i]["I"] += S_I - I_R;
        results[i]["R"] += I_R;
    }
    return results;
}


TimeSeries microSIR(const CompartmentMap & compartments,
                    const ParameterMap & parameters)
{
    TimeSeries results;
    unsigned seed = std::chrono::system_clock::now().time_since_epoch().count();
    std::default_random_engine gen (seed);
    std::uniform_real_distribution<double> dist(0.0, 1.0);
    double beta = parameters.at("R0") /
        (calcN(compartments) * parameters.at("D"));
    double r = 1.0 / parameters.at("D");
    int n = parameters.at("iterations");
    AgentVector agents;
    int j = 1;

    // Setup agents
    for (auto & c: compartments) {
        for (int i = 0; i < c.second; i++, j++) {
            Agent a;
            a.id = j;
            a.compartment = c.first;
            agents.push_back(a);
        }
    }
    results.push_back(compartments);

    int totalInfections = 0;
    for (int i = 0; i < n; i++) {
        printf("I %f", results[i].at("I"));
        const double delta = beta * results[i].at("I");
        // printf("Delta: %f\n", delta);
        int infections = 0;
        for (auto & a: agents) {
            if (a.compartment == "S") {
                if (dist(gen) < delta) {
                    a.compartment = "I";
                    a.changed = i;
                    ++infections;
                }
            } else if (a.compartment == "I" && a.changed != i) {
                if (dist(gen) < r)
                    a.compartment = "R";
            }
        }
        totalInfections += infections;
        printf("Beta, Delta, Infections %f %f %d\n", beta, delta, totalInfections);

        CompartmentMap newCompartments;
        for (auto & c: compartments)
            newCompartments[c.first] = 0.0;

        for (auto & a: agents)
            ++newCompartments[a.compartment];
        results.push_back(newCompartments);
    }
    return results;
}

void printResult(const char * desc, int i, const CompartmentMap & result)
{
    printf("%s\t%d", desc, i);
    for (auto & r: result)
        printf("\t%s\t%.2f", r.first.c_str(), r.second);
    printf("\n");
}

double meanTimeSeries(const std::vector<TimeSeries> & results,
                      const std::string compartment)
{
    double total = 0.0;
    for (auto & r: results)
        total += r.back().at(compartment);
    return total / results.size();
}

double minTimeSeries(const std::vector<TimeSeries> & results,
                      const std::string compartment)
{
    double m = FLT_MAX;
    for (auto & r: results)
        if (r.back().at(compartment) < m)
            m = r.back().at(compartment);
    return m;
}

double maxTimeSeries(const std::vector<TimeSeries> & results,
                      const std::string compartment)
{
    double m = FLT_MIN;
    for (auto & r: results)
        if (r.back().at(compartment) > m)
            m = r.back().at(compartment);
    return m;
}


void printResults(const TimeSeries & results)
{
    for (int i = 0; i < (int) results.size(); i++)
        printResult("Macro", i, results[i]);
}

int main(int argc, char *argv[])
{
    CompartmentMap SIRcompartments = {
        {"S", 900},
        {"I", 100},
        {"R", 0}
    };
    ParameterMap SIRparameters = {
        {"R0", 2.0},
        {"D", 5.0},
        {"iterations", 100},
    };

    auto macroResults = macroSIR(SIRcompartments, SIRparameters);
    printResult("Macro", 365, macroResults.back());

    std::vector<TimeSeries> microResults;
    for (int i = 0; i < 1; i++)
        microResults.push_back(microSIR(SIRcompartments, SIRparameters));

    printf("Micro\tMin\t%.2f\tMax\t%.2f\tMean\tR\t%.2f\n",
           minTimeSeries(microResults, "R"),
           maxTimeSeries(microResults, "R"),
           meanTimeSeries(microResults, "R"));
    return 0;
}
