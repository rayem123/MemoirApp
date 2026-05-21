import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createNotification } from '../lib/notificationService';

type Materiel = {
  id: string;
  nom_m: string;
  disponible: string;
  quantite: number;
  type_materiel: string;
};

export default function GestionMaterielScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [materiels, setMateriels] = useState<Materiel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMateriel, setNewMateriel] = useState('');
  const [newQuantite, setNewQuantite] = useState('');
  const [newType, setNewType] = useState('reutilisable');
  const [adding, setAdding] = useState(false);
  
  const [showQuantiteModal, setShowQuantiteModal] = useState(false);
  const [selectedMateriel, setSelectedMateriel] = useState<Materiel | null>(null);
  const [quantiteToAdd, setQuantiteToAdd] = useState('');
  const [updatingQuantite, setUpdatingQuantite] = useState(false);

  useEffect(() => {
    loadMateriels();
  }, []);

  const loadMateriels = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('materiel_medical')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMateriels(data);
    }
    setLoading(false);
  };

  const ajouterMateriel = async () => {
    if (!newMateriel.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom');
      return;
    }

    const quantite = parseInt(newQuantite) || 1;
    if (quantite <= 0) {
      Alert.alert('Erreur', 'La quantité doit être supérieure à 0');
      return;
    }

    setAdding(true);

    const { data: existing } = await supabase
      .from('materiel_medical')
      .select('id, quantite, type_materiel')
      .eq('nom_m', newMateriel.trim())
      .maybeSingle();

    if (existing) {
      const nouvelleQuantite = existing.quantite + quantite;
      
      const { error } = await supabase
        .from('materiel_medical')
        .update({ quantite: nouvelleQuantite, disponible: 'oui' })
        .eq('id', existing.id);
      
      if (error) {
        Alert.alert('Erreur', error.message);
      } else {
        const adminId = await getAdminId();
        if (adminId) {
          await createNotification(
            adminId,
            '📦 Réapprovisionnement',
            `${quantite} unité(s) ajoutée(s) à "${newMateriel.trim()}". Nouveau stock: ${nouvelleQuantite}`,
            'reapprovisionnement',
            { materiel_nom: newMateriel.trim(), quantite_ajoutee: quantite, nouveau_stock: nouvelleQuantite }
          );
        }
        
        Alert.alert('Succès', `${quantite} unité(s) ajoutée(s) à ${newMateriel.trim()}`);
        resetForm();
        await loadMateriels();
      }
    } else {
      const { error } = await supabase
        .from('materiel_medical')
        .insert({ 
          nom_m: newMateriel.trim(), 
          disponible: 'oui',
          quantite: quantite,
          type_materiel: newType
        });

      if (error) {
        Alert.alert('Erreur', error.message);
      } else {
        const typeTexte = newType === 'reutilisable' ? 'réutilisable' : 'jetable';
        const adminId = await getAdminId();
        if (adminId) {
          await createNotification(
            adminId,
            '🆕 Nouveau matériel',
            `Nouveau matériel ajouté: "${newMateriel.trim()}" (${typeTexte}) avec ${quantite} unité(s).`,
            'nouveau_materiel',
            { materiel_nom: newMateriel.trim(), quantite: quantite, type: newType }
          );
        }
        
        Alert.alert('Succès', `Matériel ajouté avec ${quantite} unité(s) (${typeTexte})`);
        resetForm();
        await loadMateriels();
      }
    }
    setAdding(false);
  };

  const getAdminId = async (): Promise<string | null> => {
    const { data } = await supabase
      .from('utilisateur')
      .select('id')
      .eq('role', 'admin')
      .single();
    return data?.id || null;
  };

  const resetForm = () => {
    setNewMateriel('');
    setNewQuantite('');
    setNewType('reutilisable');
  };

  const openQuantiteModal = (materiel: Materiel) => {
    setSelectedMateriel(materiel);
    setQuantiteToAdd('');
    setShowQuantiteModal(true);
  };

  const ajouterQuantite = async () => {
    if (!selectedMateriel) return;
    
    const quantite = parseInt(quantiteToAdd);
    if (isNaN(quantite) || quantite <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir une quantité valide');
      return;
    }

    setUpdatingQuantite(true);
    
    const nouvelleQuantite = selectedMateriel.quantite + quantite;
    
    const { error } = await supabase
      .from('materiel_medical')
      .update({ 
        quantite: nouvelleQuantite,
        disponible: nouvelleQuantite > 0 ? 'oui' : 'non'
      })
      .eq('id', selectedMateriel.id);

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      const adminId = await getAdminId();
      if (adminId) {
        await createNotification(
          adminId,
          '📦 Réapprovisionnement',
          `${quantite} unité(s) ajoutée(s) à "${selectedMateriel.nom_m}". Nouveau stock: ${nouvelleQuantite}`,
          'reapprovisionnement',
          { materiel_id: selectedMateriel.id, materiel_nom: selectedMateriel.nom_m, quantite_ajoutee: quantite, nouveau_stock: nouvelleQuantite }
        );
      }
      
      Alert.alert('Succès', `${quantite} unité(s) ajoutée(s) à ${selectedMateriel.nom_m}`);
      setShowQuantiteModal(false);
      await loadMateriels();
    }
    setUpdatingQuantite(false);
  };

  const supprimerMateriel = async (id: string, nom: string) => {
    Alert.alert(
      'Supprimer',
      'Êtes-vous sûr de vouloir supprimer ce matériel ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('materiel_medical')
              .delete()
              .eq('id', id);
            
            if (error) {
              Alert.alert('Erreur', error.message);
            } else {
              const adminId = await getAdminId();
              if (adminId) {
                await createNotification(
                  adminId,
                  '🗑️ Matériel supprimé',
                  `Le matériel "${nom}" a été supprimé de l'inventaire.`,
                  'materiel_supprime',
                  { materiel_nom: nom }
                );
              }
              await loadMateriels();
            }
          }
        }
      ]
    );
  };

  const getStockStatus = (quantite: number) => {
    if (quantite === 0) return { text: 'Rupture', color: '#ff4444' };
    if (quantite <= 3) return { text: 'Stock faible', color: '#ff8800' };
    return { text: 'En stock', color: '#4CAF50' };
  };

  const getTypeLabel = (type: string) => {
    return type === 'reutilisable' ? '🔄 Réutilisable' : '🗑️ Jetable';
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.primary }]}>Gestion du matériel</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Ajouter nouveau matériel */}
      <View style={[styles.addContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.addTitle, { color: colors.text }]}>Ajouter du matériel</Text>
        
        <TextInput
          style={[styles.addInput, { borderColor: colors.border, color: colors.text }]}
          placeholder="Nom du matériel"
          placeholderTextColor={colors.textSecondary}
          value={newMateriel}
          onChangeText={setNewMateriel}
        />
        
        <TextInput
          style={[styles.addInput, { borderColor: colors.border, color: colors.text }]}
          placeholder="Quantité"
          placeholderTextColor={colors.textSecondary}
          value={newQuantite}
          onChangeText={setNewQuantite}
          keyboardType="numeric"
        />

        <Text style={[styles.addTitle, { color: colors.text, marginTop: 10 }]}>Type de matériel</Text>
        <View style={styles.typeContainer}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              newType === 'reutilisable' && styles.typeButtonActive,
              { borderColor: colors.border }
            ]}
            onPress={() => setNewType('reutilisable')}
          >
            <Text style={[styles.typeText, { color: newType === 'reutilisable' ? colors.primary : colors.text }]}>
              🔄 Réutilisable
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              newType === 'consommable' && styles.typeButtonActive,
              { borderColor: colors.border }
            ]}
            onPress={() => setNewType('consommable')}
          >
            <Text style={[styles.typeText, { color: newType === 'consommable' ? colors.primary : colors.text }]}>
              🗑️ Jetable
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]} 
          onPress={ajouterMateriel} 
          disabled={adding}
        >
          {adding ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.addButtonText}>➕ Ajouter le matériel</Text>}
        </TouchableOpacity>
      </View>

      {/* Liste du matériel */}
      <Text style={[styles.listTitle, { color: colors.text }]}>📦 Inventaire du matériel :</Text>
      
      {materiels.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucun matériel enregistré</Text>
      ) : (
        materiels.map(item => {
          const stockStatus = getStockStatus(item.quantite);
          return (
            <View key={item.id} style={[styles.materielCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.materielInfo}>
                <Text style={[styles.materielNom, { color: colors.text }]}>{item.nom_m}</Text>
                <Text style={[styles.materielType, { color: colors.primary }]}>{getTypeLabel(item.type_materiel)}</Text>
                <View style={styles.quantiteContainer}>
                  <Text style={[styles.quantiteLabel, { color: colors.textSecondary }]}>Quantité:</Text>
                  <Text style={[styles.quantiteValue, { color: colors.primary, fontWeight: 'bold' }]}>{item.quantite}</Text>
                  <View style={[styles.stockBadge, { backgroundColor: stockStatus.color }]}>
                    <Text style={styles.stockText}>{stockStatus.text}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.materielActions}>
                <TouchableOpacity onPress={() => openQuantiteModal(item)}>
                  <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => supprimerMateriel(item.id, item.nom_m)}>
                  <Ionicons name="trash-outline" size={24} color="#ff4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}

      {/* Modal pour ajouter de la quantité */}
      <Modal visible={showQuantiteModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>Ajouter du stock</Text>
              <TouchableOpacity onPress={() => setShowQuantiteModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalLabel, { color: colors.text }]}>
              Matériel: {selectedMateriel?.nom_m}
            </Text>
            <Text style={[styles.modalTypeLabel, { color: colors.primary }]}>
              Type: {getTypeLabel(selectedMateriel?.type_materiel || 'reutilisable')}
            </Text>
            <Text style={[styles.modalSubLabel, { color: colors.textSecondary }]}>
              Stock actuel: {selectedMateriel?.quantite} unité(s)
            </Text>
            
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              placeholder="Quantité à ajouter"
              placeholderTextColor={colors.textSecondary}
              value={quantiteToAdd}
              onChangeText={setQuantiteToAdd}
              keyboardType="numeric"
            />
            
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={ajouterQuantite} disabled={updatingQuantite}>
              {updatingQuantite ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalButtonText}>➕ Ajouter au stock</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 10,
  },
  backButton: { padding: 4 },
  title: { fontSize: 22, fontWeight: 'bold' },
  addContainer: { borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1 },
  addTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  addInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  addButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  listTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, marginTop: 10 },
  materielCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1 },
  materielInfo: { flex: 1 },
  materielNom: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  materielType: { fontSize: 12, marginBottom: 6 },
  quantiteContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  quantiteLabel: { fontSize: 13 },
  quantiteValue: { fontSize: 14, fontWeight: '600' },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  stockText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  materielActions: { flexDirection: 'row', gap: 16 },
  emptyText: { textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalLabel: { fontSize: 14, marginBottom: 5 },
  modalTypeLabel: { fontSize: 12, marginBottom: 5 },
  modalSubLabel: { fontSize: 12, marginBottom: 15 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
  modalButton: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  typeContainer: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  typeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  typeButtonActive: { backgroundColor: '#f0e6f0' },
  typeText: { fontSize: 14, fontWeight: '500' },
});