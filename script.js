function calcular() {
  const bin1 = document.getElementById('bin1').value.trim();
  const bin2 = document.getElementById('bin2').value.trim();
  const operacao = document.getElementById('operacao').value;

  if (!/^([01]+)$/.test(bin1) || !/^([01]+)$/.test(bin2)) {
    document.getElementById('resultado').innerText = 'Digite apenas números binários válidos.';
    return;
  }

  const num1 = parseInt(bin1, 2);
  const num2 = parseInt(bin2, 2);
  let resultadoDecimal;

  switch (operacao) {
    case '+': resultadoDecimal = num1 + num2; break;
    case '-': resultadoDecimal = num1 - num2; break;
    case '*': resultadoDecimal = num1 * num2; break;
    case '/':
      if (num2 === 0) {
        document.getElementById('resultado').innerText = 'Divisão por zero não é permitida.';
        return;
      }
      resultadoDecimal = Math.floor(num1 / num2);
      break;
  }

  const resultadoBinario = resultadoDecimal.toString(2);
  document.getElementById('resultado').innerText = `Resultado: ${resultadoBinario} (binário)`;
}

function converter() {
  const bin = document.getElementById('binConvert').value.trim();

  if (!/^([01]+)$/.test(bin)) {
    document.getElementById('conversoes').innerText = 'Digite um número binário válido.';
    return;
  }

  const decimal = parseInt(bin, 2);
  const octal = decimal.toString(8);
  const hexadecimal = decimal.toString(16).toUpperCase();

  document.getElementById('conversoes').innerHTML = `
    Decimal: <strong>${decimal}</strong><br>
    Octal: <strong>${octal}</strong><br>
    Hexadecimal: <strong>${hexadecimal}</strong>
  `;
}

function executarCodigo() {
  const html = document.getElementById('htmlCode').value;
  const css = `<style>${document.getElementById('cssCode').value}</style>`;
  const js = `<script>${document.getElementById('jsCode').value}<\/script>`;

  const iframe = document.getElementById('preview');
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html + css + js);
  doc.close();
}

function calcularComplemento2() {
  const bin = document.getElementById('complementInput').value.trim();

  if (!/^([01]+)$/.test(bin)) {
    document.getElementById('resultadoComplemento').innerText = 'Digite um número binário válido.';
    return;
  }

  const bitLength = bin.length;
  const valorDecimal = parseInt(bin, 2);
  const complemento = (Math.pow(2, bitLength) - valorDecimal).toString(2).padStart(bitLength, '0');

  document.getElementById('resultadoComplemento').innerText =
    `Complemento de 2: ${complemento}`;
}
