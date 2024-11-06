import './style.css';
import * as d3 from 'd3';

const gridSize = 26; // 26x26 grid
const cellSize = 30; // Pixel size of each cell

const appState = {
  currentBrush: null, // Can be 'start', 'end', 'barrier'
  start: null,
  end: null,
  barriers: new Set(),
  isDrawing: false,  // Track if the left mouse is being dragged
  isErasing: false,  // Track if the right mouse is being dragged
};

const svg = d3.select('#grid')
  .attr('width', gridSize * cellSize)
  .attr('height', gridSize * cellSize);

// Create a 20x20 grid of cells
for (let x = 0; x < gridSize; x++) {
  for (let y = 0; y < gridSize; y++) {
    svg.append('rect')
      .attr('x', x * cellSize)
      .attr('y', y * cellSize)
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('class', 'cell')
      .attr('data-x', x)
      .attr('data-y', y)
      .style('fill', 'white')
      .style('stroke', '#ddd')
      .on('mousedown', (event) => handleMouseDown(event, x, y))
      .on('mousemove', (event) => handleMouseMove(event, x, y))
      .on('mouseup', handleMouseUp)
      .on('contextmenu', (event) => event.preventDefault());  // Prevent default right-click menu
  }
}

// Button event listeners
document.querySelector('#startButton').addEventListener('click', () => setBrush('start'));
document.querySelector('#endButton').addEventListener('click', () => setBrush('end'));
document.querySelector('#barrierButton').addEventListener('click', () => setBrush('barrier'));
document.querySelector('#clearGridButton').addEventListener('click', clearGrid);
document.querySelector('#findPathButton').addEventListener('click', findPath);

function setBrush(type) {
  appState.currentBrush = type;

  // Remove 'selected' class from all buttons, then add to the selected one
  document.querySelectorAll('#controls button').forEach(button => button.classList.remove('selected'));

  // Add 'selected' class to the active button
  switch (type) {
    case 'start':
      document.querySelector('#startButton').classList.add('selected');
      break;
    case 'end':
      document.querySelector('#endButton').classList.add('selected');
      break;
    case 'barrier':
      document.querySelector('#barrierButton').classList.add('selected');
      break;
  }
}


function handleMouseDown(event, x, y) {
  if (event.button === 0) {  // Left mouse button
    appState.isDrawing = true;
    handleCellClick(x, y);
  } else if (event.button === 2) {  // Right mouse button
    appState.isErasing = true;
    handleCellRightClick(x, y);
  }
}

function handleMouseMove(event, x, y) {
  if (appState.isDrawing) {
    handleCellClick(x, y);
  } else if (appState.isErasing) {
    handleCellRightClick(x, y);
  }
}

function handleMouseUp() {
  appState.isDrawing = false;
  appState.isErasing = false;
}

function handleCellClick(x, y) {
  const cellId = `${x}-${y}`;

  if (appState.currentBrush === 'start') {
    if (appState.start) svg.select(`[data-x="${appState.start[0]}"][data-y="${appState.start[1]}"]`).style('fill', 'white');
    appState.start = [x, y];
    svg.select(`[data-x="${x}"][data-y="${y}"]`).style('fill', 'green');
  } else if (appState.currentBrush === 'end') {
    if (appState.end) svg.select(`[data-x="${appState.end[0]}"][data-y="${appState.end[1]}"]`).style('fill', 'white');
    appState.end = [x, y];
    svg.select(`[data-x="${x}"][data-y="${y}"]`).style('fill', 'red');
  } else if (appState.currentBrush === 'barrier') {
    appState.barriers.add(cellId);
    svg.select(`[data-x="${x}"][data-y="${y}"]`).style('fill', 'black');
  }
}

function handleCellRightClick(x, y) {
  const cellId = `${x}-${y}`;
  if (appState.barriers.has(cellId)) {
    appState.barriers.delete(cellId);
    svg.select(`[data-x="${x}"][data-y="${y}"]`).style('fill', 'white');
  }
}

function clearGrid() {
  svg.selectAll('.cell').style('fill', 'white');
  appState.start = null;
  appState.end = null;
  appState.barriers.clear();
}

async function findPath() {
  if (!appState.start || !appState.end) {
    alert('Please set start and end points.');
    return;
  }

  const grid = Array.from({ length: gridSize }, (_, x) => 
    Array.from({ length: gridSize }, (_, y) => ({
      x, y, isBarrier: appState.barriers.has(`${x}-${y}`), isStart: false, isEnd: false,
    }))
  );
  
  const requestData = {
    grid,
    start: appState.start,
    end: appState.end,
  };
  const apiUrl = import.meta.env.VITE_API_URL;
  const response = await fetch(`${apiUrl}/find-path`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData),
  });
  const data = await response.json();

  if (data.path) {
    animatePath(data.path);
  } else {
    alert(data.message);
  }
}

function animatePath(path) {
  // Exclude the last coordinate to keep the end cell red
  const pathWithoutEnd = path.slice(0, -1);

  pathWithoutEnd.forEach(([x, y], index) => {
    setTimeout(() => {
      svg.select(`[data-x="${x}"][data-y="${y}"]`).style('fill', 'blue');
    }, index * 100);
  });
}
