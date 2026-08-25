// Simula latencia de red para que los estados de carga se comporten como con un endpoint real.
export function mockDelay(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
