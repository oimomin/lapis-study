export type Database = {
    public: {
        Tables: {
            users: {
                Row: {
                    email: string;
                    first_name: string;
                    id: string;
                    last_name: string;
                    line_link_token: string | null;
                    line_user_id: string | null;
                    role: string;
                };
                Insert: {
                    email?: string;
                    first_name?: string;
                    id: string;
                    last_name?: string;
                    line_link_token?: string | null;
                    line_user_id?: string | null;
                    role?: string;
                };
                Update: {
                    email?: string;
                    first_name?: string;
                    id?: string;
                    last_name?: string;
                    line_link_token?: string | null;
                    line_user_id?: string | null;
                    role?: string;
                };
                Relationships: [];
            };
            family_connections: {
                Row: {
                    id: string;
                    parent_id: string;
                    student_id: string;
                };
                Insert: {
                    id?: string;
                    parent_id: string;
                    student_id: string;
                };
                Update: {
                    id?: string;
                    parent_id?: string;
                    student_id?: string;
                };
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
};
