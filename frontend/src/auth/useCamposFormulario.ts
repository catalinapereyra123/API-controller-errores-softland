import { useCallback, useState } from 'react'

type Errores<T> = Partial<Record<keyof T, string>>

/**
 * Estado de un formulario simple de texto: valores, errores por campo y
 * validación. Escribir en un campo limpia su error, así el mensaje desaparece
 * apenas la persona corrige.
 */
export function useCamposFormulario<T extends Record<string, string>>(
  valoresIniciales: T,
) {
  const [campos, setCampos] = useState<T>(valoresIniciales)
  const [errores, setErrores] = useState<Errores<T>>({})

  const actualizar = useCallback((campo: keyof T, valor: string) => {
    setCampos((previos) => ({ ...previos, [campo]: valor }))
    setErrores((previos) => {
      if (!(campo in previos)) return previos
      const resto = { ...previos }
      delete resto[campo]
      return resto
    })
  }, [])

  /** Corre el validador y devuelve true si no hubo errores. */
  const validar = useCallback(
    (validador: (campos: T) => Errores<T>) => {
      const resultado = validador(campos)
      setErrores(resultado)
      return Object.keys(resultado).length === 0
    },
    [campos],
  )

  return { campos, errores, actualizar, validar }
}
