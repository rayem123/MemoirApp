import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const { data, error } = await supabase
      .from('notification')
      .select('*')
      .eq('utilisateur_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notification')
      .update({ est_lue: true })
      .eq('id', id);
    
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, est_lue: true } : n)
    );
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'nouvelle_intervention': return 'medical-outline';
      case 'intervention_acceptee': return 'checkmark-circle-outline';
      case 'intervention_refusee': return 'close-circle-outline';
      case 'intervention_terminee': return 'checkmark-done-outline';
      case 'stock_alerte': return 'warning-outline';
      default: return 'notifications-outline';
    }
  };

  const getIconColor = (type: string) => {
    switch(type) {
      case 'stock_alerte': return '#ff8800';
      case 'intervention_refusee': return '#ff4444';
      case 'intervention_terminee': return '#4CAF50';
      default: return colors.primary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.primary }]}>Notifications</Text>
      
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.notificationItem,
              { backgroundColor: colors.surface, borderColor: colors.border },
              !item.est_lue && styles.unread
            ]}
            onPress={() => markAsRead(item.id)}
          >
            <View style={[styles.iconContainer, { backgroundColor: getIconColor(item.type) + '20' }]}>
              <Ionicons name={getIcon(item.type)} size={24} color={getIconColor(item.type)} />
            </View>
            <View style={styles.content}>
              <Text style={[styles.notificationTitle, { color: colors.text }]}>{item.titre}</Text>
              <Text style={[styles.notificationMessage, { color: colors.textSecondary }]}>{item.message}</Text>
              <Text style={[styles.notificationDate, { color: colors.textSecondary }]}>
                {new Date(item.created_at).toLocaleDateString('fr-FR')}
              </Text>
            </View>
            {!item.est_lue && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Aucune notification</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  notificationItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  unread: { opacity: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  content: { flex: 1 },
  notificationTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  notificationMessage: { fontSize: 14, marginBottom: 4 },
  notificationDate: { fontSize: 11 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 16, textAlign: 'center' },
});