const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const GRID_SIZE = 20;
let gates = [];
let wires = [];
let selectedGate = null;
let connecting = false;
let startGate = null;
let currentPos = { x: 0, y: 0 };
let simulationStep = -1;

canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);

function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function addInput() {
  const letter = document.getElementById('inputLetter').value.toUpperCase();
  if (!letter || !/^[A-Z]$/.test(letter)) {
    alert('Selecione uma letra válida (A-Z).');
    return;
  }
  if (gates.find(g => g.type === `INPUT_${letter}`)) {
    alert(`Entrada ${letter} já existe.`);
    return;
  }
  addGate(`INPUT_${letter}`);
}

function addGate(type) {
  const isInput = type.startsWith('INPUT_');
  const gate = {
    id: gates.length,
    type,
    x: snapToGrid(100),
    y: snapToGrid(100),
    width: isInput ? 50 : 70,
    height: 30,
    inputs: type === 'NOT' ? [null] : [null, null],
    output: null,
    value: type === 'INPUT_0' ? 0 : type === 'INPUT_1' ? 1 : type.startsWith('INPUT_') ? '0' : null
  };
  gates.push(gate);
  drawCanvas();
  generateTruthTable();
}

function startConnection() {
  connecting = true;
}

function clearCanvas() {
  gates = [];
  wires = [];
  connecting = false;
  startGate = null;
  simulationStep = -1;
  document.getElementById('resultado').innerText = 'Saída: -';
  document.getElementById('truth-table-content').innerHTML = '';
  document.getElementById('inputPopup').style.display = 'none';
  drawCanvas();
}

function showInputPopup() {
  const inputGates = gates.filter(g => g.type.startsWith('INPUT_') && g.type !== 'INPUT_0' && g.type !== 'INPUT_1');
  if (inputGates.length === 0) {
    alert('Nenhuma entrada variável para editar.');
    return;
  }
  let html = '';
  inputGates.forEach(gate => {
    const letter = gate.type.replace('INPUT_', '');
    html += `<div><label>${letter}: </label><input id="input_${gate.id}" value="${gate.value}" size="3"></div>`;
  });
  document.getElementById('inputFields').innerHTML = html;
  document.getElementById('inputPopup').style.display = 'flex';
}

function applyInputValues() {
  const inputGates = gates.filter(g => g.type.startsWith('INPUT_') && g.type !== 'INPUT_0' && g.type !== 'INPUT_1');
  let valid = true;
  inputGates.forEach(gate => {
    const input = document.getElementById(`input_${gate.id}`);
    const value = input.value.trim().toUpperCase();
    if (value === '0' || value === '1' || value === '0') {
      gate.value = value === '0' ? 0 : value === '1' ? 1 : '0';
    } else {
      valid = false;
      alert(`Valor inválido para ${gate.type.replace('INPUT_', '')}. Use 0 ou 1.`);
    }
  });
  if (valid) {
    document.getElementById('inputPopup').style.display = 'none';
    simulationStep = -1;
    evaluateCircuit();
    generateTruthTable();
    drawCanvas();
  }
}

function closeInputPopup() {
  document.getElementById('inputPopup').style.display = 'none';
}

function drawCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Desenhar grade
  ctx.beginPath();
  for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
  }
  for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
  }
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Desenhar fios
  wires.forEach(wire => {
    const startGate = gates.find(g => g.id === wire.startGateId);
    const endGate = gates.find(g => g.id === wire.endGateId);
    if (startGate && endGate) {
      wire.startX = startGate.x + startGate.width;
      wire.startY = startGate.y + startGate.height / 2;
      wire.endX = endGate.x;
      wire.endY = endGate.y + endGate.height / 2;
      ctx.beginPath();
      ctx.moveTo(wire.startX, wire.startY);
      ctx.lineTo(wire.endX, wire.endY);
      ctx.strokeStyle = simulationStep >= 0 && wire.active ? '#ff5555' : '#a5b4fc';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });

  // Desenhar portas
  gates.forEach(gate => {
    ctx.fillStyle = gate === selectedGate ? '#4f46e5' : simulationStep >= 0 && gate.active ? '#ff5555' : '#2c2c3e';
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(gate.x, gate.y, gate.width, gate.height);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#a5b4fc';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    const displayText = gate.type.startsWith('INPUT_') ? 
      gate.type.replace('INPUT_', '') + (gate.value !== null ? ` (${gate.value})` : '') : 
      gate.type;
    ctx.fillText(displayText, gate.x + gate.width / 2, gate.y + gate.height / 2 + 4);
  });

  // Desenhar fio temporário
  if (connecting && startGate) {
    ctx.beginPath();
    ctx.moveTo(startGate.x + startGate.width, startGate.y + startGate.height / 2);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.strokeStyle = '#a5b4fc';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function handleMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const x = snapToGrid(e.clientX - rect.left);
  const y = snapToGrid(e.clientY - rect.top);

  if (connecting) {
    const endGate = gates.find(g => 
      x >= g.x && x <= g.x + g.width && y >= g.y && y <= g.y + g.height
    );
    if (startGate && endGate && startGate !== endGate) {
      const inputIndex = endGate.inputs[0] === null ? 0 : (endGate.inputs[1] === null && endGate.type !== 'NOT' ? 1 : -1);
      if (inputIndex !== -1 && !endGate.inputs.includes(startGate)) {
        endGate.inputs[inputIndex] = startGate;
        wires.push({
          startGateId: startGate.id,
          endGateId: endGate.id,
          startX: startGate.x + startGate.width,
          startY: startGate.y + startGate.height / 2,
          endX: endGate.x,
          endY: endGate.y + endGate.height / 2,
          active: false
        });
        evaluateCircuit();
        generateTruthTable();
      }
      connecting = false;
      startGate = null;
    } else if (!startGate) {
      startGate = gates.find(g => 
        x >= g.x && x <= g.x + g.width && y >= g.y && y <= g.y + g.height
      );
    }
  } else {
    selectedGate = gates.find(g => 
      x >= g.x && x <= g.x + g.width && y >= g.y && y <= g.y + g.height
    );
  }
  drawCanvas();
}

function handleMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  currentPos.x = snapToGrid(e.clientX - rect.left);
  currentPos.y = snapToGrid(e.clientY - rect.top);

  if (selectedGate) {
    selectedGate.x = currentPos.x - selectedGate.width / 2;
    selectedGate.y = currentPos.y - selectedGate.height / 2;
  }
  drawCanvas();
}

function handleMouseUp() {
  selectedGate = null;
  drawCanvas();
}

function evaluateGate(gate, step = -1) {
  if (!gate) return null;
  if (step >= 0 && !gate.active) return null; // Durante simulação, portas inativas não propagam

  // Entradas fixas ou variáveis
  if (gate.type === 'INPUT_0') return 0;
  if (gate.type === 'INPUT_1') return 1;
  if (gate.type.startsWith('INPUT_')) {
    return gate.value;
  }

  // Avaliar entradas
  const input1 = gate.inputs[0] ? evaluateGate(gate.inputs[0], step) : null;
  const input2 = gate.type !== 'NOT' ? (gate.inputs[1] ? evaluateGate(gate.inputs[1], step) : null) : null;

  // Verificar se todas as entradas necessárias estão presentes
  if (gate.type !== 'NOT' && (input1 === null || input2 === null)) {
    return null;
  }
  if (gate.type === 'NOT' && input1 === null) {
    return null;
  }

  if (input1 === '0' || (gate.type !== 'NOT' && input2 === '0')) {
    return '0';
  }

  // Calcular saída lógica
  switch (gate.type) {
    case 'AND': return input1 && input2 ? 1 : 0;
    case 'OR': return input1 || input2 ? 1 : 0;
    case 'NOT': return input1 ? 0 : 1;
    case 'NAND': return input1 && input2 ? 0 : 1;
    case 'NOR': return input1 || input2 ? 0 : 1;
    case 'XNOR': return input1 === input2 ? 1 : 0;
    case 'XOR': return input1 !== input2 ? 1 : 0;
    default: return null;
  }
}

function evaluateCircuit() {
  const outputGates = gates.filter(g => !wires.some(w => w.startGateId === g.id));
  const results = outputGates.map(g => {
    const value = evaluateGate(g);
    return (value === 0 || value === 1) ? value : 0;
  }).filter(r => r !== null);
  document.getElementById('resultado').innerText = `Saída: ${results.length ? results.join(', ') : '-'}`;
}

function generateTruthTable() {
  const uniqueInputVars = [...new Set(
    gates
      .filter(g => g.type.startsWith('INPUT_') && g.type !== 'INPUT_0' && g.type !== 'INPUT_1')
      .map(g => g.type.replace('INPUT_', ''))
  )]; // aqui vai criar gates separadas para mesmas variáveis de entrada ao invés de usar a mesma entrada
  
  const outputGates = gates.filter(g => !wires.some(w => w.startGateId === g.id));
  if (uniqueInputVars.length === 0 || outputGates.length === 0) {
    document.getElementById('truth-table-content').innerHTML = '';
    return;
  }

  const numRows = Math.pow(2, uniqueInputVars.length); // Limite para tabelas grandes
  let tableHTML = '<tr><th>' + uniqueInputVars.join('</th><th>') + '</th><th>Saída</th></tr>';

  for (let i = 0; i < numRows; i++) {
    const binary = (i >>> 0).toString(2).padStart(uniqueInputVars.length, '0').split('').map(Number);
    
    // Set all gates with the same variable to the same value
    uniqueInputVars.forEach((variable, index) => {
      const gatesForVariable = gates.filter(g => g.type === `INPUT_${variable}`);
      gatesForVariable.forEach(gate => {
        gate.value = binary[index];
      });
    });
    
    const output = outputGates.map(g => {
      const value = evaluateGate(g);
      return (value === 0 || value === 1) ? value : 0;
    })[0] || '0';
    
    tableHTML += `<tr><td>${binary.join('</td><td>')}</td><td>${output}</td></tr>`;
  }

  // resetar os inputs para '0'
  gates.filter(g => g.type.startsWith('INPUT_') && g.type !== 'INPUT_0' && g.type !== 'INPUT_1')
       .forEach(gate => gate.value = '0');

  document.getElementById('truth-table-content').innerHTML = tableHTML;
}

function generateCircuitFromEquation() {
  const equation = document.getElementById('equation').value.trim();
  if (!equation) {
    alert('Digite uma equação válida.');
    return;
  }

  // Limpar circuito existente
  gates = [];
  wires = [];
  let x = 50, y = 100;

  // tive que criar uma funçao para transformar os simbolos em operadores
  function normalizeEquation(eq) {
    let normalized = eq.toUpperCase();
    
    // XOR e XNOR primeiro
    normalized = normalized.replace(/⊕/g, ' XOR ');
    normalized = normalized.replace(/⊙/g, ' XNOR ');
    normalized = normalized.replace(/⊖/g, ' XOR '); 
    normalized = normalized.replace(/⊗/g, ' XOR ');
    
    // AND
    normalized = normalized.replace(/⋅/g, ' AND ');
    normalized = normalized.replace(/\*/g, ' AND ');
    normalized = normalized.replace(/\./g, ' AND ');
    normalized = normalized.replace(/∧/g, ' AND ');
    
    // OR
    normalized = normalized.replace(/\+/g, ' OR ');
    normalized = normalized.replace(/∨/g, ' OR ');
    
    // NOT
    normalized = normalized.replace(/¬/g, '!');
    normalized = normalized.replace(/~/g, '!');
    normalized = normalized.replace(/'/g, '!');
    normalized = normalized.replace(/̄/g, '!');
    
    // adicionar espaços ao redor de parênteses e operadores
    normalized = normalized.replace(/\(/g, ' ( ');
    normalized = normalized.replace(/\)/g, ' ) ');
    normalized = normalized.replace(/!/g, ' ! ');
    
    // remover espaços
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }

  // Função para tokenizar a equação, como ja ta tratada algumas coisas foram removidas
  function tokenize(equation) {
    const normalized = normalizeEquation(equation);
    const tokens = [];
    let i = 0;
    
    while (i < normalized.length) {
      // Skip spaces
      while (i < normalized.length && /\s/.test(normalized[i])) i++;
      if (i >= normalized.length) break;

      // Check for operators first (longer ones first)
      if (normalized.slice(i, i + 4) === 'NAND') {
        tokens.push('NAND');
        i += 4;
      } else if (normalized.slice(i, i + 4) === 'XNOR') {
        tokens.push('XNOR');
        i += 4;
      } else if (normalized.slice(i, i + 3) === 'AND') {
        tokens.push('AND');
        i += 3;
      } else if (normalized.slice(i, i + 3) === 'NOR') {
        tokens.push('NOR');
        i += 3;
      } else if (normalized.slice(i, i + 3) === 'XOR') {
        tokens.push('XOR');
        i += 3;
      } else if (normalized.slice(i, i + 2) === 'OR') {
        tokens.push('OR');
        i += 2;
      } else if (/[A-Z]/.test(normalized[i])) {
        tokens.push(normalized[i]);
        i++;
      } else if (['(', ')', '!'].includes(normalized[i])) {
        tokens.push(normalized[i]);
        i++;
      } else {
        throw new Error(`Caractere inválido na posição ${i}: ${normalized[i]}`);
      }
    }
    
    return tokens;
  }

  // Função para parsear tokens em uma árvore de expressão
  function parseExpression(tokens) {
    let i = 0;

    function parsePrimary() {
      if (i >= tokens.length) throw new Error('Equação incompleta.');
      const token = tokens[i];
      i++;
      if (/[A-Z]/.test(token)) {
        return { type: 'INPUT', value: token };
      }
      if (token === '(') {
        const expr = parseOr();
        if (i >= tokens.length || tokens[i] !== ')') {
          throw new Error('Parêntese de fechamento esperado.');
        }
        i++;
        return expr;
      }
      if (token === '!') {
        const operand = parsePrimary();
        return { type: 'NOT', inputs: [operand] };
      }
      throw new Error(`Token inesperado: ${token}`);
    }

    function parseAnd() {
      let left = parsePrimary();
      while (i < tokens.length && (tokens[i] === 'AND' || tokens[i] === 'NAND')) {
        const op = tokens[i];
        i++;
        const right = parsePrimary();
        left = { type: op, inputs: [left, right] };
      }
      return left;
    }

    function parseOr() {
      let left = parseAnd();
      while (i < tokens.length && (tokens[i] === 'OR' || tokens[i] === 'NOR' || tokens[i] === 'XOR' || tokens[i] === 'XNOR')) {
        const op = tokens[i];
        i++;
        const right = parseAnd();
        left = { type: op, inputs: [left, right] };
      }
      return left;
    }

    const result = parseOr();
    if (i < tokens.length) {
      throw new Error(`Token inesperado após a expressão: ${tokens[i]}`);
    }
    return result;
  }

  // função para criar portas a partir da árvore de expressão
  function buildCircuit(expr, xPos, yPos, inputCounter = { counter: 0 }) {
    if (expr.type === 'INPUT') {
      const inputLetter = expr.value;
      
      // teve que ser mudado para permitir entradas repetidas sem ficar feio kk
      const gate = {
        id: gates.length,
        type: `INPUT_${inputLetter}`,
        x: snapToGrid(xPos),
        y: snapToGrid(yPos),
        width: 50,
        height: 30,
        inputs: [],
        output: null,
        value: '0'
      };
      gates.push(gate);
      return gate;
    }

    const gate = {
      id: gates.length,
      type: expr.type,
      x: snapToGrid(xPos),
      y: snapToGrid(yPos),
      width: expr.type === 'NOT' ? 50 : 70,
      height: 30,
      inputs: expr.type === 'NOT' ? [null] : [null, null],
      output: null
    };
    gates.push(gate);

    // Processar entradas
    if (expr.type === 'NOT') {
      const inputGate = buildCircuit(expr.inputs[0], xPos - 100, yPos, inputCounter);
      gate.inputs[0] = inputGate;
      wires.push({
        startGateId: inputGate.id,
        endGateId: gate.id,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        active: false
      });
    } else {
      const input1 = buildCircuit(expr.inputs[0], xPos - 100, yPos - 40, inputCounter);
      const input2 = buildCircuit(expr.inputs[1], xPos - 100, yPos + 40, inputCounter);
      gate.inputs[0] = input1;
      gate.inputs[1] = input2;
      wires.push({
        startGateId: input1.id,
        endGateId: gate.id,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        active: false
      });
      wires.push({
        startGateId: input2.id,
        endGateId: gate.id,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        active: false
      });
    }

    return gate;
  }

  try {
    const tokens = tokenize(equation);
    const exprTree = parseExpression(tokens);
    buildCircuit(exprTree, x + 300, y + 50); // botei pra 300 por que tava saindo fora da tela
    evaluateCircuit();
    generateTruthTable();
    drawCanvas();
    alert('Circuito gerado com sucesso!');
  } catch (error) {
    alert(`Erro ao processar equação: ${error.message}`);
    clearCanvas();
  }
}

function saveCircuit() {
  const circuit = { gates, wires };
  const blob = new Blob([JSON.stringify(circuit, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'circuit.json';
  a.click();
  URL.revokeObjectURL(url);
}

function loadCircuit() {
  const file = document.getElementById('loadCircuit').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const circuit = JSON.parse(e.target.result);
      gates = circuit.gates || [];
      wires = circuit.wires || [];
      simulationStep = -1;
      evaluateCircuit();
      generateTruthTable();
      drawCanvas();
    } catch (error) {
      alert('Erro ao carregar circuito: ' + error.message);
    }
  };
  reader.readAsText(file);
}

function exportTruthTable() {
  // adaptado para deixar bonito quase mesmo esquema
  const inputGates = [...new Set(
    gates
      .filter(g => g.type.startsWith('INPUT_') && g.type !== 'INPUT_0' && g.type !== 'INPUT_1')
      .map(g => g.type.replace('INPUT_', '')) // ja faz o replace
  )];
  
  const outputGates = gates.filter(g => !wires.some(w => w.startGateId === g.id));
  if (inputGates.length === 0 || outputGates.length === 0) {
    alert('Nenhum circuito para exportar.');
    return;
  }

  let csv = inputGates.join(',') + ',Saída\n';
  const numRows = Math.pow(2, inputGates.length);

  for (let i = 0; i < numRows; i++) {
    const binary = (i >>> 0).toString(2).padStart(inputGates.length, '0').split('').map(Number);
    
    // aqui vai criar gates separadas para mesmas variáveis de entrada ao invés de usar a mesma entrada
    inputGates.forEach((variable, index) => {
      const gatesForVariable = gates.filter(g => g.type === `INPUT_${variable}`);
      gatesForVariable.forEach(gate => {
        gate.value = binary[index];
      });
    });
    
    const output = outputGates.map(g => {
      const value = evaluateGate(g);
      return (value === 0 || value === 1) ? value : 0;
    })[0] || '0';
    
    csv += `${binary.join(',')},${output}\n`;
  }

  // resetar os inputs
  gates.filter(g => g.type.startsWith('INPUT_') && g.type !== 'INPUT_0' && g.type !== 'INPUT_1')
       .forEach(gate => gate.value = '0');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'truth_table.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function stepSimulation() {
  simulationStep++;
  const inputGates = gates.filter(g => g.type.startsWith('INPUT_') && g.type !== 'INPUT_0' && g.type !== 'INPUT_1');
  const outputGates = gates.filter(g => !wires.some(w => w.startGateId === g.id));

  // Resetar estado ativo
  gates.forEach(gate => gate.active = false);
  wires.forEach(wire => wire.active = false);

  if (simulationStep === 0) {
    // Ativar entradas
    inputGates.forEach(gate => gate.active = true);
    drawCanvas();
    return;
  }

  // Propagar sinais
  let stepGates = [...inputGates];
  for (let i = 0; i < simulationStep; i++) {
    const nextGates = [];
    stepGates.forEach(gate => {
      wires.filter(w => w.startGateId === gate.id).forEach(wire => {
        const endGate = gates.find(g => g.id === wire.endGateId);
        if (endGate && !endGate.active) {
          endGate.active = true;
          wire.active = true;
          nextGates.push(endGate);
        }
      });
    });
    stepGates = nextGates;
  }

  evaluateCircuit();
  drawCanvas();

  if (stepGates.length === 0 || simulationStep > gates.length) {
    simulationStep = -1;
  }
}

function insertSymbol(symbol) {
  const input = document.getElementById('equation');
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const before = input.value.substring(0, start);
  const after = input.value.substring(end);
  input.value = before + symbol + after;
  input.focus();
  input.selectionStart = input.selectionEnd = start + symbol.length;
}

function deleteLastSymbol() {
  const input = document.getElementById('equation');
  const start = input.selectionStart;
  const end = input.selectionEnd;
  if (start === end && start > 0) {
    input.value = input.value.slice(0, start - 1) + input.value.slice(end);
    input.selectionStart = input.selectionEnd = start - 1;
  } else {
    input.value = input.value.slice(0, start) + input.value.slice(end);
    input.selectionStart = input.selectionEnd = start;
  }
  input.focus();
}

function clearEquation() {
  const input = document.getElementById('equation');
  input.value = '';
  input.focus();
}


// Inicializar canvas
drawCanvas();