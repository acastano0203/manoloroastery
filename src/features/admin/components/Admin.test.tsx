// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AdminApi } from '../hooks/useAdmin'
import * as servicio from '../services/adminService'
import type { Perfil, Rol } from '../types'
import { ConPermiso, RequiereRol } from './Acceso'
import { generarClave } from './CrearUsuario'
import { RolesAdmin } from './RolesAdmin'
import { UsuariosAdmin } from './UsuariosAdmin'

const yo = { rol: null as Rol | null, permisos: [] as string[], esAdmin: false }
vi.mock('../hooks/usePermisos', () => ({
  usePermisos: () => ({
    cargando: false, error: null, rol: yo.rol, esAdmin: yo.esAdmin, veLotes: false,
    puede: (p: string) => yo.esAdmin || yo.permisos.includes(p),
  }),
}))
vi.mock('../../auth/hooks/useAuth', () => ({ useAuth: () => ({ sesion: { user: { id: 'u1', email: 'admin@x.co' } }, salir: vi.fn() }) }))
vi.mock('../services/adminService', () => ({
  cambiarPermiso: vi.fn(async () => {}), crearRol: vi.fn(async () => {}), eliminarRol: vi.fn(async () => {}),
  renombrarRol: vi.fn(async () => {}), asignarRol: vi.fn(async () => {}), cambiarNombre: vi.fn(async () => {}),
  crearUsuario: vi.fn(async () => {}),
}))

const admin: Rol = { id: 'r-admin', nombre: 'Administrador', administrador: true, permisos: [] }
const tostador: Rol = { id: 'r-tost', nombre: 'Tostador', administrador: false, permisos: ['tablero', 'curvas'] }
const perfiles: Perfil[] = [
  { id: 'u1', correo: 'admin@x.co', nombre: null, rolId: 'r-admin' },
  { id: 'u2', correo: 'nuevo@x.co', nombre: null, rolId: null },
]
const api = (): AdminApi => ({
  roles: [admin, tostador], perfiles, cargando: false, error: null, ok: null, setError: vi.fn(), setOk: vi.fn(),
  ejecutar: async (f) => { await f(); return true },
})

afterEach(() => { cleanup(); vi.clearAllMocks(); yo.rol = null; yo.permisos = []; yo.esAdmin = false })

describe('Acceso según el rol', () => {
  it('sin rol: pide al administrador que le asigne uno', () => {
    render(<MemoryRouter><RequiereRol><p>App</p></RequiereRol></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Tu usuario no tiene un rol' })).toBeTruthy()
    expect(screen.queryByText('App')).toBeNull()
  })

  it('una pantalla sin permiso muestra el aviso; con permiso, la pantalla', () => {
    yo.rol = tostador
    yo.permisos = tostador.permisos
    render(<MemoryRouter><ConPermiso p="configuracion"><p>Precios</p></ConPermiso><ConPermiso p="curvas"><p>Curvas</p></ConPermiso></MemoryRouter>)
    expect(screen.queryByText('Precios')).toBeNull()
    expect(screen.getByText(/Tu rol no tiene acceso/)).toBeTruthy()
    expect(screen.getByText('Curvas')).toBeTruthy()
  })
})

describe('Administración', () => {
  it('marcar una pantalla le da el permiso al rol; desmarcarla se lo quita', async () => {
    render(<RolesAdmin api={api()} />)
    const rol = screen.getByRole('region', { name: 'Rol Tostador' })
    fireEvent.click(within(rol).getByRole('checkbox', { name: /Historial/ }))
    await waitFor(() => expect(servicio.cambiarPermiso).toHaveBeenCalledWith('r-tost', 'historial', true))
    fireEvent.click(within(rol).getByRole('checkbox', { name: /Curvas de tostión/ }))
    await waitFor(() => expect(servicio.cambiarPermiso).toHaveBeenCalledWith('r-tost', 'curvas', false))
  })

  it('el rol Administrador ve todo y no se puede eliminar', () => {
    render(<RolesAdmin api={api()} />)
    const rol = screen.getByRole('region', { name: 'Rol Administrador' })
    expect(within(rol).queryByRole('checkbox')).toBeNull()
    expect(within(rol).queryByRole('button', { name: /Eliminar/ })).toBeNull()
  })

  it('crear un rol nuevo', async () => {
    render(<RolesAdmin api={api()} />)
    fireEvent.change(screen.getByLabelText('Nuevo rol'), { target: { value: 'Bodega' } })
    fireEvent.click(screen.getByRole('button', { name: /Crear rol/ }))
    await waitFor(() => expect(servicio.crearRol).toHaveBeenCalledWith('Bodega'))
  })

  it('asignar un rol a un usuario nuevo', async () => {
    render(<UsuariosAdmin api={api()} />)
    expect(screen.getByText('1 usuario está esperando un rol.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Rol de nuevo@x.co'), { target: { value: 'r-tost' } })
    await waitFor(() => expect(servicio.asignarRol).toHaveBeenCalledWith('u2', 'r-tost'))
  })
})

describe('Crear usuario', () => {
  /** Abre el formulario y devuelve las consultas dentro de él. */
  const abrir = () => {
    render(<UsuariosAdmin api={api()} />)
    fireEvent.click(screen.getByRole('button', { name: /Crear usuario/ }))
    return within(screen.getByRole('heading', { name: 'Nuevo usuario' }).closest('form') as HTMLElement)
  }

  it('pide correo válido, contraseña de 8 o más y un rol', () => {
    const f = abrir()
    fireEvent.change(f.getByLabelText('Correo'), { target: { value: 'malo' } })
    fireEvent.change(f.getByLabelText('Contraseña'), { target: { value: '123' } })
    fireEvent.click(f.getByRole('button', { name: 'Crear usuario' }))
    expect(screen.getByText('Correo no válido.')).toBeTruthy()
    expect(screen.getByText('Mínimo 8 caracteres.')).toBeTruthy()
    expect(screen.getByText('Elige un rol.')).toBeTruthy()
    expect(servicio.crearUsuario).not.toHaveBeenCalled()
  })

  it('crea el usuario con su rol y muestra los datos para compartir', async () => {
    const f = abrir()
    fireEvent.change(f.getByLabelText('Correo'), { target: { value: 'Pedro@Correo.com ' } })
    fireEvent.change(f.getByLabelText('Nombre (opcional)'), { target: { value: 'Pedro' } })
    fireEvent.change(f.getByLabelText('Contraseña'), { target: { value: 'cafe-2026' } })
    fireEvent.change(f.getByLabelText('Rol'), { target: { value: 'r-tost' } })
    fireEvent.click(f.getByRole('button', { name: 'Crear usuario' }))
    await waitFor(() => expect(servicio.crearUsuario).toHaveBeenCalledWith({ correo: 'Pedro@Correo.com', clave: 'cafe-2026', nombre: 'Pedro', rolId: 'r-tost' }))
    const aviso = await screen.findByRole('status')
    expect(within(aviso).getByText('Usuario creado como Tostador.')).toBeTruthy()
    expect(aviso.textContent).toContain('pedro@correo.com')
    expect(aviso.textContent).toContain('cafe-2026')
  })

  it('si falla, muestra el motivo', async () => {
    vi.mocked(servicio.crearUsuario).mockRejectedValueOnce(new Error('Ya existe un usuario con ese correo.'))
    const f = abrir()
    fireEvent.change(f.getByLabelText('Correo'), { target: { value: 'ana@x.co' } })
    fireEvent.change(f.getByLabelText('Contraseña'), { target: { value: '12345678' } })
    fireEvent.change(f.getByLabelText('Rol'), { target: { value: 'r-tost' } })
    fireEvent.click(f.getByRole('button', { name: 'Crear usuario' }))
    expect(await screen.findByText('Ya existe un usuario con ese correo.')).toBeTruthy()
  })

  it('genera contraseñas de 10 caracteres sin letras confusas', () => {
    for (let i = 0; i < 20; i++) expect(generarClave()).toMatch(/^[a-km-np-zA-HJ-NP-Z2-9]{10}$/)
  })
})
