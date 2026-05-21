import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const screenWidth = Dimensions.get('window').width - 40;

type Mesure = {
  id: string;
  valeur: number;
  date_mesure: string;
  heure_mesure: string;
  note: string;
  type_mesure: {
    id: string;
    nom: string;
    unite: string;
    couleur: string;
  };
};

export default function ProCarnetPatientScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { patientId, patientNom, patientPrenom } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mesures, setMesures] = useState<Mesure[]>([]);
  const [typesMesure, setTypesMesure] = useState<any[]>([]);
  const [patientInfo, setPatientInfo] = useState<any>(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [newValeur, setNewValeur] = useState('');
  const [newDate, setNewDate] = useState(new Date());
  const [newHeure, setNewHeure] = useState(new Date());
  const [newNote, setNewNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeChartType, setActiveChartType] = useState('tension');

  useEffect(() => {
    if (patientId) {
      loadData();
    }
  }, [patientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger les infos du patient
      const { data: patient } = await supabase
        .from('patient')
        .select('id, adresse, age, poids, tension, diabete, maladies_chronique, groupe_sangine')
        .eq('id', patientId)
        .single();

      if (patient) {
        setPatientInfo(patient);
      }

      // Charger les types de mesure
      const { data: types } = await supabase
        .from('type_mesure')
        .select('*')
        .order('nom');
      
      if (types) {
        setTypesMesure(types);
        if (types.length > 0 && !selectedType) {
          setSelectedType(types[0].nom);
        }
      }

      // Charger les mesures du patient
      const { data: mesuresData } = await supabase
        .from('mesure_sante')
        .select(`
          id,
          valeur,
          date_mesure,
          heure_mesure,
          note,
          type_mesure:type_mesure_id (id, nom, unite, couleur)
        `)
        .eq('patient_id', patientId)
        .order('date_mesure', { ascending: true })
        .order('heure_mesure', { ascending: true });

      if (mesuresData) {
        setMesures(mesuresData);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const addMeasure = async () => {
    if (!newValeur) {
      Alert.alert('Erreur', 'Veuillez saisir une valeur');
      return;
    }

    setSaving(true);

    const type = typesMesure.find(t => t.nom === selectedType);
    if (!type) {
      Alert.alert('Erreur', 'Type de mesure non trouvé');
      setSaving(false);
      return;
    }

    const dateStr = newDate.toISOString().split('T')[0];
    const heureStr = newHeure.toTimeString().split(' ')[0];

    const { error } = await supabase
      .from('mesure_sante')
      .insert({
        patient_id: patientId,
        type_mesure_id: type.id,
        valeur: parseFloat(newValeur),
        date_mesure: dateStr,
        heure_mesure: heureStr,
        note: newNote || null
      });

    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Succès', 'Mesure ajoutée');
      setModalVisible(false);
      setNewValeur('');
      setNewNote('');
      setNewDate(new Date());
      setNewHeure(new Date());
      loadData();
    }
    setSaving(false);
  };

  const getChartData = () => {
    const filtered = mesures.filter(m => m.type_mesure?.nom === activeChartType);
    if (filtered.length === 0) return { labels: [], valeurs: [] };
    
    const sorted = [...filtered].sort((a, b) => 
      new Date(a.date_mesure).getTime() - new Date(b.date_mesure).getTime()
    );
    
    const labels = sorted.map(m => {
      const date = new Date(m.date_mesure);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    const valeurs = sorted.map(m => m.valeur);
    
    return { labels, valeurs };
  };

  const getTypeCouleur = (typeNom: string) => {
    const type = typesMesure.find(t => t.nom === typeNom);
    return type?.couleur || '#844567';
  };

  const getTypeUnite = (typeNom: string) => {
    const type = typesMesure.find(t => t.nom === typeNom);
    return type?.unite || '';
  };

  const chartData = getChartData();
  const hasData = chartData.valeurs.length > 0;
  const maxValue = chartData.valeurs.length > 0 ? Math.max(...chartData.valeurs) : 100;

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: getTypeCouleur(activeChartType) },
    yAxisMin: 0,
    yAxisMax: maxValue + (maxValue * 0.1),
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'tension': 'Tension artérielle',
      'poids': 'Poids',
      'glycemie': 'Glycémie'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text }}>Chargement...</Text>
      </View>
    );
  }

  const toutesLesMesures = [...mesures].reverse();

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.primary} />
      </TouchableOpacity>
      
      <Text style={[styles.title, { color: colors.primary }]}>📋 Carnet de santé</Text>
      <Text style={[styles.patientName, { color: colors.textSecondary }]}>{patientPrenom} {patientNom}</Text>
      
      {patientInfo && (
        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.infoTitle, { color: colors.primary }]}>Informations patient</Text>
          {patientInfo.poids && <Text style={[styles.infoText, { color: colors.text }]}>⚖️ Poids: {patientInfo.poids} kg</Text>}
          {patientInfo.tension && <Text style={[styles.infoText, { color: colors.text }]}>🩺 Tension: {patientInfo.tension}</Text>}
          {patientInfo.diabete && <Text style={[styles.infoText, { color: '#ff8800' }]}>🩸 Diabète: {patientInfo.diabete}</Text>}
          {patientInfo.maladies_chronique && (
            <Text style={[styles.infoText, { color: '#ff8800' }]}>🏥 Maladies chroniques: {patientInfo.maladies_chronique}</Text>
          )}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.primary }]}>📊 Évolution des mesures</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartTypeScroll}>
        {typesMesure.map(type => (
          <TouchableOpacity
            key={type.id}
            style={[styles.chartTypeBtn, activeChartType === type.nom && { backgroundColor: type.couleur }]}
            onPress={() => setActiveChartType(type.nom)}
          >
            <Text style={[styles.chartTypeText, { color: activeChartType === type.nom ? '#fff' : colors.text }]}>
              {getTypeLabel(type.nom)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {hasData ? (
        <LineChart
          data={{
            labels: chartData.labels.slice(-15),
            datasets: [{ data: chartData.valeurs.slice(-15), color: (opacity = 1) => getTypeCouleur(activeChartType), strokeWidth: 2 }]
          }}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          fromZero={true}
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Ionicons name="analytics-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune mesure enregistrée</Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.primary }]}>📋 Historique des mesures</Text>
      
      {toutesLesMesures.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune mesure enregistrée</Text>
      ) : (
        toutesLesMesures.slice(0, 10).map(m => {
          const dateObj = new Date(m.date_mesure);
          const dateFormatee = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
          const heureFormatee = m.heure_mesure ? m.heure_mesure.slice(0,5) : '00:00';
          
          return (
            <View key={m.id} style={[styles.measureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.measureHeader}>
                <Text style={[styles.measureType, { color: m.type_mesure?.couleur || colors.primary }]}>
                  {m.type_mesure?.nom || 'Mesure'} • {m.valeur} {m.type_mesure?.unite || ''}
                </Text>
                <Text style={[styles.measureDate, { color: colors.textSecondary }]}>
                  {dateFormatee} à {heureFormatee}
                </Text>
              </View>
              {m.note && <Text style={[styles.measureNote, { color: colors.textSecondary }]}>📝 {m.note}</Text>}
            </View>
          );
        })
      )}

      <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setModalVisible(true)}>
        <Ionicons name="add-circle-outline" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Ajouter une mesure</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>Ajouter une mesure</Text>
            
            <Text style={[styles.modalLabel, { color: colors.text }]}>Type de mesure</Text>
            <View style={styles.modalTypeContainer}>
              {typesMesure.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.modalTypeBtn, selectedType === type.nom && { backgroundColor: type.couleur }]}
                  onPress={() => setSelectedType(type.nom)}
                >
                  <Text style={[styles.modalTypeText, { color: selectedType === type.nom ? '#fff' : colors.text }]}>
                    {type.nom}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: colors.text }]}>Valeur ({getTypeUnite(selectedType)})</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              placeholder="Ex: 12.5"
              placeholderTextColor={colors.textSecondary}
              value={newValeur}
              onChangeText={setNewValeur}
              keyboardType="numeric"
            />

            <Text style={[styles.modalLabel, { color: colors.text }]}>Date</Text>
            <TouchableOpacity style={[styles.dateButton, { borderColor: colors.border }]} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: colors.text }}>{newDate.toLocaleDateString()}</Text>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.modalLabel, { color: colors.text }]}>Heure</Text>
            <TouchableOpacity style={[styles.dateButton, { borderColor: colors.border }]} onPress={() => setShowTimePicker(true)}>
              <Text style={{ color: colors.text }}>{newHeure.toLocaleTimeString().slice(0,5)}</Text>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.modalLabel, { color: colors.text }]}>Note (optionnel)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              placeholder="Ajouter une note..."
              placeholderTextColor={colors.textSecondary}
              value={newNote}
              onChangeText={setNewNote}
              multiline
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setModalVisible(false)}>
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]} onPress={addMeasure} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalConfirmBtnText}>Ajouter</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showDatePicker && (
        <DateTimePicker value={newDate} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if (d) setNewDate(d); }} />
      )}
      {showTimePicker && (
        <DateTimePicker value={newHeure} mode="time" display="default" onChange={(e, t) => { setShowTimePicker(false); if (t) setNewHeure(t); }} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  patientName: { fontSize: 18, textAlign: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 12 },
  infoCard: { borderRadius: 12, padding: 16, marginBottom: 20 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  infoText: { fontSize: 14, marginBottom: 4 },
  chartTypeScroll: { flexDirection: 'row', marginBottom: 10 },
  chartTypeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, backgroundColor: '#f0f0f0' },
  chartTypeText: { fontSize: 14 },
  chart: { marginVertical: 8, borderRadius: 16 },
  noDataContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { textAlign: 'center', marginTop: 12 },
  measureCard: { borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1 },
  measureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  measureType: { fontSize: 14, fontWeight: '600' },
  measureDate: { fontSize: 12 },
  measureNote: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 20, marginBottom: 30, gap: 8 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: '500', marginBottom: 5, marginTop: 10 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 10 },
  modalTextArea: { minHeight: 80, textAlignVertical: 'top' },
  modalTypeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  modalTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ddd', minWidth: '30%' },
  modalTypeText: { fontSize: 14 },
  dateButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 10 },
  modalButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  modalCancelBtnText: { fontSize: 15, fontWeight: '500' },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalConfirmBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});