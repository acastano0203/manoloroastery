import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Registro } from '../types'
import { useRegistros } from './useRegistros'

/** Editar / enviar / eliminar (con confirmación) un registro creado. */
export function useAccionesRegistro(r: Registro) {
  const { enviar, eliminar, setAviso } = useRegistros()
  const navigate = useNavigate()
  const [confirmando, setConfirmando] = useState(false)
  const enviando = r.estado === 'Enviando'

  return {
    enviando,
    confirmando,
    enviarTxt: enviando ? 'Enviando…' : r.estado === 'Error' ? 'Reenviar' : 'Enviar',
    abrir: () => navigate(`/registros/${r.id}`),
    editar: () => navigate(`/registros/${r.id}/editar`),
    enviar: () => void enviar(r.id),
    pedirEliminar: () => {
      setAviso(null)
      setConfirmando(true)
    },
    cancelar: () => setConfirmando(false),
    eliminar: () => {
      setConfirmando(false)
      void eliminar(r)
    },
  }
}
