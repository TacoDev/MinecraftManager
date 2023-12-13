import React from 'react';
import Plot from "react-plotly.js";
import ServerCalls from "./Utils/ServerCalls";
import './Graphs.css';

// CPU
let CPUSpeedSeries: any = { x: [], y: [], mode: 'lines', name: "CPU Speed", line: { shape: 'spline' }, yaxis: 'y2' };
let systemSeries: any = { x: [], y: [], mode: 'lines', name: "system", fill: "tozeroy", line: { shape: 'spline' } };
let userSeries: any = { x: [], y: [], mode: 'lines', name: "user", fill: "tonexty", line: { shape: 'spline' } };
let idleSeries: any = { x: [], y: [], mode: 'lines', name: "idle", fill: "tonexty", line: { shape: 'spline' } };
// Load
let oneSeries: any = { x: [], y: [], mode: 'lines', name: "one minute", fill: "tozeroy", line: { shape: 'spline' } };
let fiveSeries: any = { x: [], y: [], mode: 'lines', name: "five minutes", fill: "tozeroy", line: { shape: 'spline' } };
let fifteenSeries: any = { x: [], y: [], mode: 'lines', name: "fifteen minutes", fill: "tozeroy", line: { shape: 'spline' } };
// Memory
let freeSeries: { x: number[], y: number[], mode: "lines", name: "free", fill: "tonexty", line: any } = { x: [], y: [], mode: 'lines', name: "free", fill: "tonexty", line: { shape: 'spline' } };
let inUseSeries: any = { x: [], y: [], mode: 'lines', name: "used", fill: "tozeroy", line: { shape: 'spline' } };

const GBtoMB = 1024 * 1024 * 1024;
const checkInterval = 5000;

function fixMemoryData(data: ServerStatistics) {
  freeSeries = { ...freeSeries, x: [], y: [] };
  inUseSeries = { ...inUseSeries, x: [], y: [] };
  for (var i = 0; i < data.loadHistory.length; i++) {
    inUseSeries.y.push((data.memoryHistory[i].totalMemory - data.memoryHistory[i].freeMemory) / GBtoMB);
    freeSeries.y.push(data.memoryHistory[i].totalMemory / GBtoMB);
    inUseSeries.x.push(data.memoryHistory[i].timeStamp);
    freeSeries.x.push(data.memoryHistory[i].timeStamp);
  }
}

const startTime = new Date().getTime();
function fixLoadHistory(data: ServerStatistics) {
  oneSeries = { ...oneSeries, x: [], y: [] };
  fiveSeries = { ...fiveSeries, x: [], y: [] };
  fifteenSeries = { ...fifteenSeries, x: [], y: [] };
  for (var i = 0; i < data.loadHistory.length; i++) {
    var nextTime = startTime - (i * checkInterval);
    oneSeries.y.push(data.loadHistory[i].one);
    fiveSeries.y.push(data.loadHistory[i].five);
    fifteenSeries.y.push(data.loadHistory[i].fifteen);
    oneSeries.x.push(nextTime);
    fiveSeries.x.push(nextTime);
    fifteenSeries.x.push(nextTime);
  }
}
function fixCPUData(data: ServerStatistics) {
  CPUSpeedSeries = { ...CPUSpeedSeries, x: [], y: [] };
  systemSeries = { ...systemSeries, x: [], y: [] };
  userSeries = { ...userSeries, x: [], y: [] };
  idleSeries = { ...idleSeries, x: [], y: [] };
  for (var i = data.cpuHistory.length - 1; i >= 0; i--) {
    getCPUSeries(data, i, CPUSpeedSeries, systemSeries, userSeries, idleSeries);
  }
}

function getCPUSeries(data: ServerStatistics, i: number, CPUSeries: any, systemSeries: any, userSeries: any, idleSeries: any) {
  var timeStamp = 0;
  var cores = data.cpuHistory[i].idle.length;
  var systemSum = 0;
  var userSum = 0;
  var cpuSpeedSum = 0;
  for (var j = 0; j < cores; j++) {
    timeStamp = data.cpuHistory[i].timeStamp;
    cpuSpeedSum += data.cpuHistory[i].CPUSpeed[j];
    systemSum += data.cpuHistory[i].system[j];
    userSum += data.cpuHistory[i].user[j];
  }
  cpuSpeedSum = cpuSpeedSum / cores;
  systemSum = systemSum / cores;
  userSum = (userSum / cores) + systemSum;
  CPUSeries.y.unshift(cpuSpeedSum);
  CPUSeries.x.unshift(timeStamp);
  systemSeries.y.unshift(systemSum);
  systemSeries.x.unshift(timeStamp);
  userSeries.y.unshift(userSum);
  userSeries.x.unshift(timeStamp);
  idleSeries.y.unshift(100);
  idleSeries.x.unshift(timeStamp);
}


let stats: ServerStatistics;
let timer: any = null;
let firstCall = true;
async function updateStats(redraw: () => void) {
  if (firstCall) {
    firstCall = false;
    stats = await ServerCalls.getStatistics();
    fixCPUData(stats);
    fixMemoryData(stats);
    fixLoadHistory(stats);
    redraw();
  }
  if (timer === null) {
    timer = setInterval(async () => {
      stats = await ServerCalls.getStatistics();
      fixCPUData(stats);
      fixMemoryData(stats);
      fixLoadHistory(stats);
      redraw();
    }, 5000);
  }
}

function Graphs() {
  const [, updateState] = React.useState();
  const useForceUpdate = React.useCallback(() => updateState({} as any), []);

  React.useEffect(() => {
    updateStats(() => {
      useForceUpdate();
    });
    return () => {
      timer = null;
      clearInterval(timer);
    };
  }, []);
  return (
    <div className="graph_list">
      <Plot
        useResizeHandler
        data={[CPUSpeedSeries, systemSeries, userSeries, idleSeries]}
        layout={{
          showlegend: true,
          legend: {
            x: 0,
            y: -.45,
          },
          autosize: true,
          title: "CPU Utilization",
          xaxis: {
            type: 'date'
          },
          yaxis: {
            title: 'CPU Usage',
            range: [
              0,
              100
            ]
          },
          yaxis2: {
            title: 'CPU Speed',
            overlaying: 'y',
            side: 'right',
            rangemode: 'tozero'
          }
        }}
      />
      <Plot
        useResizeHandler
        data={[oneSeries, fiveSeries, fifteenSeries]}
        layout={{
          autosize: true,
          showlegend: true,
          legend: {
            x: 0,
            y: -.45,
          },
          title: "Load History",
          xaxis: {
            type: 'date'
          },
          yaxis: {
            autorange: true,
            rangemode: 'tozero'
          }
        }}
      />
      <Plot
        useResizeHandler
        data={[freeSeries, inUseSeries]}
        layout={{
          autosize: true,
          showlegend: true,
          legend: {
            x: 0,
            y: -.45,
          },
          title: "Memory Usage",
          xaxis: {
            type: 'date'
          },
          yaxis: {
            autorange: true,
            rangemode: 'tozero'
          }
        }}
      />
    </div>
  );
}

export default Graphs;
