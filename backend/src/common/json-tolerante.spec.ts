import { parsearJsonTolerante, repararJson } from './json-tolerante';

// Como lo arma iFlow: el ERRMSG de Softland pegado tal cual en el JSON.
const MENSAJE = String.raw`Se ha producido un error, verificar el archivo c:\padron\2026-10-20_10.36.00.290_CO_Err_IFLOW.txt`;
const BODY_DE_IFLOW = `{ "empresa": "IFLOW", "modulo": "COMPRAS", "identi": "VIS-32051", "statusSoftland": "E", "error": "${MENSAJE}" }`;

describe('parsearJsonTolerante', () => {
  it('un JSON válido se parsea igual que siempre y no se repara', () => {
    const texto = JSON.stringify({ error: MENSAJE, n: 1 });

    expect(parsearJsonTolerante(texto)).toEqual({
      valor: { error: MENSAJE, n: 1 },
      reparado: false,
    });
  });

  it('acepta el body real de iFlow con la ruta de Windows sin escapar', () => {
    expect(() => {
      JSON.parse(BODY_DE_IFLOW);
    }).toThrow(/Bad escaped character/);

    const { valor, reparado } = parsearJsonTolerante(BODY_DE_IFLOW);

    expect(reparado).toBe(true);
    expect(valor).toEqual({
      empresa: 'IFLOW',
      modulo: 'COMPRAS',
      identi: 'VIS-32051',
      statusSoftland: 'E',
      error: MENSAJE,
    });
  });

  it('las barras quedan literales aunque formen un escape válido (c:\\temp no es un tab)', () => {
    const texto = String.raw`{"error": "c:\temp\nuevo\2026.txt"}`;

    expect(parsearJsonTolerante(texto).valor).toEqual({
      error: String.raw`c:\temp\nuevo\2026.txt`,
    });
  });

  it('respeta las comillas escapadas y escapa los saltos de línea sueltos', () => {
    const texto = `{"error": "dice \\"hola\\" en c:\\padron\nsegunda línea"}`;

    expect(parsearJsonTolerante(texto).valor).toEqual({
      error: 'dice "hola" en c:\\padron\nsegunda línea',
    });
  });

  it('si está roto por otra cosa, tira el error del texto original', () => {
    expect(() => parsearJsonTolerante('{"error": "sin cerrar"')).toThrow(
      SyntaxError,
    );
  });
});

describe('repararJson', () => {
  it('no toca nada fuera de los strings', () => {
    expect(repararJson('{ "a" : 1,\n "b": [true, null] }')).toBe(
      '{ "a" : 1,\n "b": [true, null] }',
    );
  });
});
