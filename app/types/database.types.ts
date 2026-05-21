export type Database = {
  public: {
    Tables: {
      utilisateur: {
        Row: {
          id: string;
          nom: string;
          prenom: string;
          email: string;
          telephone: string;
          password_hash: string;
          role: 'patient' | 'medecin' | 'infirmier' | 'aide_soignant' | 'admin';
          statut: 'actif' | 'en_attente' | 'refuse';
          photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          prenom: string;
          email: string;
          telephone: string;
          password_hash: string;
          role: 'patient' | 'medecin' | 'infirmier' | 'aide_soignant' | 'admin';
          statut?: 'actif' | 'en_attente' | 'refuse';
          photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nom?: string;
          prenom?: string;
          email?: string;
          telephone?: string;
          password_hash?: string;
          role?: 'patient' | 'medecin' | 'infirmier' | 'aide_soignant' | 'admin';
          statut?: 'actif' | 'en_attente' | 'refuse';
          photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      patient: {
        Row: {
          id: string;
          utilisateur_id: string;
          age: string | null;
          adresse: string | null;
          tension: string | null;
          diabete: string | null;
          poids: string | null;
          maladies_chronique: string | null;
          groupe_sangine: string | null;
          date_mesure: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          utilisateur_id: string;
          age?: string | null;
          adresse?: string | null;
          tension?: string | null;
          diabete?: string | null;
          poids?: string | null;
          maladies_chronique?: string | null;
          groupe_sangine?: string | null;
          date_mesure?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          utilisateur_id?: string;
          age?: string | null;
          adresse?: string | null;
          tension?: string | null;
          diabete?: string | null;
          poids?: string | null;
          maladies_chronique?: string | null;
          groupe_sangine?: string | null;
          date_mesure?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      type_soignant: {
        Row: { id: string; categorie: string; noms: string | null };
        Insert: { id?: string; categorie: string; noms?: string | null };
        Update: { id?: string; categorie?: string; noms?: string | null };
      };
      specialite: {
        Row: { id: string; nom: string };
        Insert: { id?: string; nom: string };
        Update: { id?: string; nom?: string };
      };
      professionnel_sante: {
        Row: {
          id: string;
          utilisateur_id: string;
          disponibilite: string | null;
          admin: boolean;
          type_soignant_id: string;
          specialite_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          utilisateur_id: string;
          disponibilite?: string | null;
          admin?: boolean;
          type_soignant_id: string;
          specialite_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          utilisateur_id?: string;
          disponibilite?: string | null;
          admin?: boolean;
          type_soignant_id?: string;
          specialite_id?: string | null;
          created_at?: string;
        };
      };
      type_symptome: {
        Row: { id: string; nom: string };
        Insert: { id?: string; nom: string };
        Update: { id?: string; nom?: string };
      };
      symptome: {
        Row: {
          id: string;
          type_symptome_id: string;
          intensite: string | null;
          duree: string | null;
          description: string | null;
          date_debut: string | null;
          patient_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          type_symptome_id: string;
          intensite?: string | null;
          duree?: string | null;
          description?: string | null;
          date_debut?: string | null;
          patient_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          type_symptome_id?: string;
          intensite?: string | null;
          duree?: string | null;
          description?: string | null;
          date_debut?: string | null;
          patient_id?: string;
          created_at?: string;
        };
      };
      consultation: {
        Row: {
          id: string;
          motif: string;
          diagnostic: string | null;
          compte_rendu: string | null;
          image_radios: string | null;
          patient_id: string;
          professionnel_id: string;
          symptome_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          motif: string;
          diagnostic?: string | null;
          compte_rendu?: string | null;
          image_radios?: string | null;
          patient_id: string;
          professionnel_id: string;
          symptome_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          motif?: string;
          diagnostic?: string | null;
          compte_rendu?: string | null;
          image_radios?: string | null;
          patient_id?: string;
          professionnel_id?: string;
          symptome_id?: string;
          created_at?: string;
        };
      };
      intervention: {
        Row: {
          id: string;
          id_machine: string | null;
          date_demande: string;
          localisation: string;
          priorite: string;
          statut: string;
          patient_id: string;
          professionnel_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          id_machine?: string | null;
          date_demande?: string;
          localisation: string;
          priorite: string;
          statut?: string;
          patient_id: string;
          professionnel_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          id_machine?: string | null;
          date_demande?: string;
          localisation?: string;
          priorite?: string;
          statut?: string;
          patient_id?: string;
          professionnel_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      perfusion: {
        Row: {
          id: string;
          volume: string | null;
          produit_perfuse: string | null;
          debit: string | null;
          duree: string | null;
          intervention_id: string;
        };
        Insert: {
          id?: string;
          volume?: string | null;
          produit_perfuse?: string | null;
          debit?: string | null;
          duree?: string | null;
          intervention_id: string;
        };
        Update: {
          id?: string;
          volume?: string | null;
          produit_perfuse?: string | null;
          debit?: string | null;
          duree?: string | null;
          intervention_id?: string;
        };
      };
      soin_plaie: {
        Row: {
          id: string;
          type_plaie: string | null;
          taille: string | null;
          profondeur: string | null;
          type_pansement: string | null;
          intervention_id: string;
        };
        Insert: {
          id?: string;
          type_plaie?: string | null;
          taille?: string | null;
          profondeur?: string | null;
          type_pansement?: string | null;
          intervention_id: string;
        };
        Update: {
          id?: string;
          type_plaie?: string | null;
          taille?: string | null;
          profondeur?: string | null;
          type_pansement?: string | null;
          intervention_id?: string;
        };
      };
      surveillance_post_hospitalisation: {
        Row: {
          id: string;
          date_sortie_hospital: string | null;
          pathologie: string | null;
          traitement_en_cours: string | null;
          evolution: string | null;
          intervention_id: string;
        };
        Insert: {
          id?: string;
          date_sortie_hospital?: string | null;
          pathologie?: string | null;
          traitement_en_cours?: string | null;
          evolution?: string | null;
          intervention_id: string;
        };
        Update: {
          id?: string;
          date_sortie_hospital?: string | null;
          pathologie?: string | null;
          traitement_en_cours?: string | null;
          evolution?: string | null;
          intervention_id?: string;
        };
      };
      reeducation: {
        Row: {
          id: string;
          type_reduction: string | null;
          nombre_seances: string | null;
          duree_seance: string | null;
          progression: string | null;
          intervention_id: string;
        };
        Insert: {
          id?: string;
          type_reduction?: string | null;
          nombre_seances?: string | null;
          duree_seance?: string | null;
          progression?: string | null;
          intervention_id: string;
        };
        Update: {
          id?: string;
          type_reduction?: string | null;
          nombre_seances?: string | null;
          duree_seance?: string | null;
          progression?: string | null;
          intervention_id?: string;
        };
      };
      analyse_medicale: {
        Row: {
          id: string;
          type: string;
          detail: any; // JSONB
          photo: string | null;
          consultation_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          detail?: any;
          photo?: string | null;
          consultation_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: string;
          detail?: any;
          photo?: string | null;
          consultation_id?: string;
          created_at?: string;
        };
      };
      materiel_medical: {
        Row: {
          id: string;
          nom_m: string;
          disponible: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nom_m: string;
          disponible?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nom_m?: string;
          disponible?: string;
          created_at?: string;
        };
      };
      publication: {
        Row: {
          id: string;
          contenu: string;
          image_url: string | null;
          likes_count: number;
          commentaires_count: number;
          professionnel_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          contenu: string;
          image_url?: string | null;
          likes_count?: number;
          commentaires_count?: number;
          professionnel_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          contenu?: string;
          image_url?: string | null;
          likes_count?: number;
          commentaires_count?: number;
          professionnel_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      commentaire: {
        Row: {
          id: string;
          commentaire: string | null;
          contenu: string | null;
          ecrire_en: string;
          publication_id: string;
          utilisateur_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          commentaire?: string | null;
          contenu?: string | null;
          ecrire_en?: string;
          publication_id: string;
          utilisateur_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          commentaire?: string | null;
          contenu?: string | null;
          ecrire_en?: string;
          publication_id?: string;
          utilisateur_id?: string;
          created_at?: string;
        };
      };
      notification: {
        Row: {
          id: string;
          titre: string;
          message: string;
          type: string;
          est_lue: boolean;
          data: any; // JSONB
          utilisateur_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          titre: string;
          message: string;
          type: string;
          est_lue?: boolean;
          data?: any;
          utilisateur_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          titre?: string;
          message?: string;
          type?: string;
          est_lue?: boolean;
          data?: any;
          utilisateur_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};