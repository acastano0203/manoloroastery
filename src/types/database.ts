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
      registros: {
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
          pago: Database['public']['Enums']['forma_pago']
          proceso: Database['public']['Enums']['proceso_cafe']
          kilos: number
          gramos: number
          n340: number
          n500: number
          n2500: number
          precio_lb: number
          precio_340: number
          precio_500: number
          precio_2500: number
          estado: Database['public']['Enums']['estado_envio']
          enviado_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          cliente_id: string
          fecha?: string
          cliente: string
          celular: string
          factura?: boolean
          tipo_doc?: Database['public']['Enums']['tipo_documento']
          num_doc?: string
          correo?: string
          pago: Database['public']['Enums']['forma_pago']
          proceso: Database['public']['Enums']['proceso_cafe']
          kilos: number
          gramos: number
          n340?: number
          n500?: number
          n2500?: number
          precio_lb: number
          precio_340: number
          precio_500: number
          precio_2500: number
          estado?: Database['public']['Enums']['estado_envio']
          enviado_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['registros']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'registros_cliente_id_fkey'
            columns: ['cliente_id']
            isOneToOne: false
            referencedRelation: 'clientes'
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
          siigo_usuario: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          unica?: boolean
          precio_lb?: number
          precio_340?: number
          precio_500?: number
          precio_2500?: number
          siigo_usuario?: string
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
      tipo_documento: 'CC' | 'NIT'
      forma_pago: 'Efectivo' | 'Banco' | 'Bold'
      proceso_cafe: 'Pergamino' | 'Natural' | 'Honey' | 'Cofermentado'
      estado_envio: 'Pendiente' | 'Enviando' | 'Enviado' | 'Error'
    }
    CompositeTypes: { [_ in never]: never }
  }
}
