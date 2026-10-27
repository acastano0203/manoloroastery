// Escrito a mano según supabase/migrations. Cuando el proyecto exista, regénéralo con:
// npx supabase gen types typescript --project-id <id> > src/types/database.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string
          numero: number
          codigo: string
          user_id: string | null
          nombre: string
          celular: string
          factura: boolean
          tipo_doc: Database['public']['Enums']['tipo_documento']
          num_doc: string
          correo: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          nombre: string
          celular: string
          factura?: boolean
          tipo_doc?: Database['public']['Enums']['tipo_documento']
          num_doc?: string
          correo?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['clientes']['Insert']>
        Relationships: []
      }
      lotes: {
        Row: {
          id: string
          numero: number
          codigo: string
          user_id: string | null
          cliente_id: string
          fecha: string
          cliente: string
          celular: string
          factura: boolean
          tipo_doc: Database['public']['Enums']['tipo_documento']
          num_doc: string
          correo: string
          /** Solo registros viejos: los pagos nuevos van en la tabla pagos. */
          pago: Database['public']['Enums']['forma_pago'] | null
          proceso: Database['public']['Enums']['proceso_cafe']
          kilos: number
          gramos: number | null
          n340: number
          n500: number
          n2500: number
          precio_lb: number
          precio_340: number
          precio_500: number
          precio_2500: number
          estado: Database['public']['Enums']['estado_envio']
          enviado_at: string | null
          etapa: Database['public']['Enums']['etapa_lote']
          llegada: Database['public']['Enums']['llegada_cafe'] | null
          humedad_pct: number | null
          densidad_gl: number | null
          n_drip: number
          precio_drip: number
          gramos_tostado: number | null
          /** Café tostado que sobró al empacar, en gramos. */
          gramos_sobrante: number | null
          almacenamiento: boolean
          almacen_dias: number | null
          almacen_gramos: number | null
          almacen_marcado: string | null
          almacen_foto: string | null
          almacen_unidad: 'g' | 'kg' | 'lb'
          reabierto_at: string | null
          /** Descripción de cada etapa: { "Trillado": "..." }. */
          descripciones: Partial<Record<Database['public']['Enums']['etapa_lote'], string>>
          /** Cuándo llegó a cada etapa (ISO). La anota un trigger al cambiar de etapa. */
          fechas_etapas: Partial<Record<Database['public']['Enums']['etapa_lote'], string>>
          nivel_tueste: Database['public']['Enums']['nivel_tueste'] | null
          presentacion: Database['public']['Enums']['presentacion'] | null
          molienda: Database['public']['Enums']['molienda'] | null
          fecha_entrega_prometida: string | null
          foto_bascula_recepcion: string | null
          observaciones: string | null
          kilos_verde: number | null
          kilos_subproducto: number | null
          bolsas_cliente: boolean
          subproducto_entregado: boolean
          foto_bascula_entrega: string | null
          entregado_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          codigo?: string
          user_id?: string | null
          cliente_id: string
          fecha?: string
          cliente: string
          celular: string
          factura?: boolean
          tipo_doc?: Database['public']['Enums']['tipo_documento']
          num_doc?: string
          correo?: string
          pago?: Database['public']['Enums']['forma_pago'] | null
          proceso: Database['public']['Enums']['proceso_cafe']
          kilos: number
          gramos?: number | null
          n340?: number
          n500?: number
          n2500?: number
          precio_lb: number
          precio_340: number
          precio_500: number
          precio_2500: number
          estado?: Database['public']['Enums']['estado_envio']
          enviado_at?: string | null
          etapa?: Database['public']['Enums']['etapa_lote']
          llegada?: Database['public']['Enums']['llegada_cafe'] | null
          humedad_pct?: number | null
          densidad_gl?: number | null
          n_drip?: number
          precio_drip?: number
          gramos_tostado?: number | null
          gramos_sobrante?: number | null
          almacenamiento?: boolean
          almacen_dias?: number | null
          almacen_gramos?: number | null
          almacen_marcado?: string | null
          almacen_foto?: string | null
          almacen_unidad?: 'g' | 'kg' | 'lb'
          reabierto_at?: string | null
          descripciones?: Partial<Record<Database['public']['Enums']['etapa_lote'], string>>
          fechas_etapas?: Partial<Record<Database['public']['Enums']['etapa_lote'], string>>
          nivel_tueste?: Database['public']['Enums']['nivel_tueste'] | null
          presentacion?: Database['public']['Enums']['presentacion'] | null
          molienda?: Database['public']['Enums']['molienda'] | null
          fecha_entrega_prometida?: string | null
          foto_bascula_recepcion?: string | null
          observaciones?: string | null
          kilos_verde?: number | null
          kilos_subproducto?: number | null
          bolsas_cliente?: boolean
          subproducto_entregado?: boolean
          foto_bascula_entrega?: string | null
          entregado_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['lotes']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'lotes_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
            referencedColumns: ['id']
          },
        ]
      }
      tostiones: {
        Row: {
          id: string
          lote_id: string
          user_id: string | null
          gramos_verde_entrada: number
          gramos_tostado_salida: number | null
          tiempo_total_min: number | null
          tiempo_desarrollo_min: number | null
          temp_carga_c: number | null
          archivo_curva: string | null
          foto_curva: string | null
          origen: 'manual' | 'automatica'
          iniciada_at: string | null
          aire_inicial: number | null
          llama_inicial: number | null
          /** Fin de secado (grano amarillo), en segundos desde la carga. */
          secado_seg: number | null
          crack_seg: number | null
          descarga_seg: number | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lote_id: string
          user_id?: string | null
          gramos_verde_entrada: number
          gramos_tostado_salida?: number | null
          tiempo_total_min?: number | null
          tiempo_desarrollo_min?: number | null
          temp_carga_c?: number | null
          archivo_curva?: string | null
          foto_curva?: string | null
          origen?: 'manual' | 'automatica'
          iniciada_at?: string | null
          aire_inicial?: number | null
          llama_inicial?: number | null
          secado_seg?: number | null
          crack_seg?: number | null
          descarga_seg?: number | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['tostiones']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'tostiones_lote_id_fkey'
            columns: ['lote_id']
            isOneToOne: false
            referencedRelation: 'lotes'
            referencedColumns: ['id']
          },
        ]
      }
      roles: {
        Row: { id: string; nombre: string; administrador: boolean; created_at: string }
        Insert: { id?: string; nombre: string; administrador?: boolean; created_at?: string }
        Update: Partial<Database['public']['Tables']['roles']['Insert']>
        Relationships: []
      }
      rol_permisos: {
        Row: { rol_id: string; permiso: Database['public']['Enums']['permiso'] }
        Insert: { rol_id: string; permiso: Database['public']['Enums']['permiso'] }
        Update: Partial<Database['public']['Tables']['rol_permisos']['Insert']>
        Relationships: [
          { foreignKeyName: 'rol_permisos_rol_id_fkey'; columns: ['rol_id']; isOneToOne: false; referencedRelation: 'roles'; referencedColumns: ['id'] },
        ]
      }
      perfiles: {
        Row: { id: string; correo: string | null; nombre: string | null; rol_id: string | null; created_at: string }
        Insert: { id: string; correo?: string | null; nombre?: string | null; rol_id?: string | null; created_at?: string }
        Update: Partial<Database['public']['Tables']['perfiles']['Insert']>
        Relationships: [
          { foreignKeyName: 'perfiles_rol_id_fkey'; columns: ['rol_id']; isOneToOne: false; referencedRelation: 'roles'; referencedColumns: ['id'] },
        ]
      }
      tostion_lecturas: {
        Row: {
          id: string
          tostion_id: string
          segundo: number
          temp_grano: number | null
          temp_tambor: number | null
          aire: number | null
          llama: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tostion_id: string
          segundo: number
          temp_grano?: number | null
          temp_tambor?: number | null
          aire?: number | null
          llama?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['tostion_lecturas']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'tostion_lecturas_tostion_id_fkey'
            columns: ['tostion_id']
            isOneToOne: false
            referencedRelation: 'tostiones'
            referencedColumns: ['id']
          },
        ]
      }
      pagos: {
        Row: {
          id: string
          lote_id: string
          user_id: string | null
          fecha: string
          valor: number
          metodo: Database['public']['Enums']['forma_pago']
          created_at: string
        }
        Insert: {
          id?: string
          lote_id: string
          user_id?: string | null
          fecha?: string
          valor: number
          metodo: Database['public']['Enums']['forma_pago']
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['pagos']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'pagos_lote_id_fkey'
            columns: ['lote_id']
            isOneToOne: false
            referencedRelation: 'lotes'
            referencedColumns: ['id']
          },
        ]
      }
      configuracion: {
        Row: {
          id: string
          unica: boolean
          precio_lb: number
          precio_340: number
          precio_500: number
          precio_2500: number
          precio_drip: number
          siigo_usuario: string
          humedad_min: number
          humedad_max: number
          trilla_min: number
          trilla_max: number
          merma_min: number
          merma_max: number
          gas_por_bache: number | null
          stock_340: number | null
          stock_500: number | null
          stock_2500: number | null
          stock_drip: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          unica?: boolean
          stock_340?: number | null
          stock_500?: number | null
          stock_2500?: number | null
          stock_drip?: number | null
          precio_lb?: number
          precio_340?: number
          precio_500?: number
          precio_2500?: number
          precio_drip?: number
          siigo_usuario?: string
          humedad_min?: number
          humedad_max?: number
          trilla_min?: number
          trilla_max?: number
          merma_min?: number
          merma_max?: number
          gas_por_bache?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['configuracion']['Insert']>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      /** No es un enum de Postgres: es el check de rol_permisos.permiso. */
      permiso: 'tablero' | 'nuevo_lote' | 'curvas' | 'historial' | 'clientes' | 'configuracion' | 'reportes' | 'administracion'
      tipo_documento: 'CC' | 'NIT'
      forma_pago: 'Efectivo' | 'Banco' | 'Bold'
      proceso_cafe: 'Pergamino' | 'Natural' | 'Honey' | 'Cofermentado' | 'En almendra (en verde)'
      estado_envio: 'Pendiente' | 'Enviando' | 'Enviado' | 'Error'
      etapa_lote: 'Recibido' | 'Trillado' | 'Tostado' | 'Empacado' | 'Entregado'
      llegada_cafe: 'Pergamino' | 'Verde'
      nivel_tueste: 'Claro' | 'Medio' | 'Oscuro'
      presentacion: 'Grano' | 'Molido'
      molienda: 'Fino' | 'Medio' | 'Grueso'
    }
    CompositeTypes: { [_ in never]: never }
  }
}
