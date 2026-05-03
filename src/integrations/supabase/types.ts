export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assemblies: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          material_relacionado_id: string
          notas: string | null
          perfil_principal_id: string
        }
        Insert: {
          cantidad?: number
          created_at?: string
          id?: string
          material_relacionado_id: string
          notas?: string | null
          perfil_principal_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          material_relacionado_id?: string
          notas?: string | null
          perfil_principal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assemblies_material_relacionado_id_fkey"
            columns: ["material_relacionado_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assemblies_perfil_principal_id_fkey"
            columns: ["perfil_principal_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      deductions_formulas: {
        Row: {
          cantidad_piezas: number
          created_at: string
          formula_corte_alto: string | null
          formula_corte_ancho: string | null
          id: string
          notas: string | null
          perfil_id: string
          tipologia_id: string
        }
        Insert: {
          cantidad_piezas?: number
          created_at?: string
          formula_corte_alto?: string | null
          formula_corte_ancho?: string | null
          id?: string
          notas?: string | null
          perfil_id: string
          tipologia_id: string
        }
        Update: {
          cantidad_piezas?: number
          created_at?: string
          formula_corte_alto?: string | null
          formula_corte_ancho?: string | null
          id?: string
          notas?: string | null
          perfil_id?: string
          tipologia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deductions_formulas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deductions_formulas_tipologia_id_fkey"
            columns: ["tipologia_id"]
            isOneToOne: false
            referencedRelation: "typologies"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          categoria: Database["public"]["Enums"]["material_category"]
          codigo_fabricante: string
          created_at: string
          descripcion: string | null
          espesor_mm: number | null
          herraje_tipo: Database["public"]["Enums"]["herraje_tipo"] | null
          id: string
          largo_estandar: number | null
          nombre_estandarizado:
            | Database["public"]["Enums"]["perfil_nombre"]
            | null
          peso: number | null
          serie_id: string | null
          vidrio_tipo: string | null
        }
        Insert: {
          categoria: Database["public"]["Enums"]["material_category"]
          codigo_fabricante: string
          created_at?: string
          descripcion?: string | null
          espesor_mm?: number | null
          herraje_tipo?: Database["public"]["Enums"]["herraje_tipo"] | null
          id?: string
          largo_estandar?: number | null
          nombre_estandarizado?:
            | Database["public"]["Enums"]["perfil_nombre"]
            | null
          peso?: number | null
          serie_id?: string | null
          vidrio_tipo?: string | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["material_category"]
          codigo_fabricante?: string
          created_at?: string
          descripcion?: string | null
          espesor_mm?: number | null
          herraje_tipo?: Database["public"]["Enums"]["herraje_tipo"] | null
          id?: string
          largo_estandar?: number | null
          nombre_estandarizado?:
            | Database["public"]["Enums"]["perfil_nombre"]
            | null
          peso?: number | null
          serie_id?: string | null
          vidrio_tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_serie_id_fkey"
            columns: ["serie_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      typologies: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          serie_id: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          serie_id: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          serie_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typologies_serie_id_fkey"
            columns: ["serie_id"]
            isOneToOne: false
            referencedRelation: "series"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      herraje_tipo:
        | "Bisagra"
        | "Carretilla"
        | "Escuadra"
        | "Felpa"
        | "Vinil"
        | "Cremona"
        | "Cierre"
        | "Brazo"
        | "Otro"
      material_category: "perfil" | "herraje" | "vidrio"
      perfil_nombre:
        | "Jamba"
        | "Zoclo"
        | "Cabezal"
        | "Riel"
        | "Traslape"
        | "Junquillo"
        | "Interlock"
        | "Escalonado"
        | "Bolsa"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      herraje_tipo: [
        "Bisagra",
        "Carretilla",
        "Escuadra",
        "Felpa",
        "Vinil",
        "Cremona",
        "Cierre",
        "Brazo",
        "Otro",
      ],
      material_category: ["perfil", "herraje", "vidrio"],
      perfil_nombre: [
        "Jamba",
        "Zoclo",
        "Cabezal",
        "Riel",
        "Traslape",
        "Junquillo",
        "Interlock",
        "Escalonado",
        "Bolsa",
      ],
    },
  },
} as const
