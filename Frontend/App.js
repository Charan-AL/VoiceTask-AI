import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StatusBar
} from 'react-native';
import { Audio } from 'expo-av';
import axios from 'axios';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from './styles.js';

export default function App() {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [tasks, setTasks] = useState([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [metering, setMetering] = useState([]);

  // Local IP address of host machine
  const myip = "192.168.1.103";

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const storedTasks = await AsyncStorage.getItem('@tasks');
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }
    } catch (error) {
      console.error('Failed to load tasks', error);
    }
  };

  const saveTasks = async (newTasks) => {
    try {
      await AsyncStorage.setItem('@tasks', JSON.stringify(newTasks));
      setTasks(newTasks);
    } catch (error) {
      console.error('Failed to save tasks', error);
    }
  };

  const toggleTaskStatus = (taskId) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: t.status === 'completed' ? 'pending' : 'completed'
        };
      }
      return t;
    });
    saveTasks(updated);
  };

  const clearAllTasks = () => {
    if (tasks.length === 0) return;
    Alert.alert(
      'Clear All Tasks',
      'Are you sure you want to delete all saved tasks?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => saveTasks([])
        }
      ]
    );
  };

  const startRecording = async () => {
    try {
      console.log('Requesting permissions..');
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission required', 'Please grant microphone permission to record voice tasks.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      setMetering([]);
      const { recording } = await Audio.Recording.createAsync(
        {
          isMeteringEnabled: true,
          android: {
            extension: '.mp3',
            outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
            audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
          },
          ios: {
            extension: '.m4a',
            audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          }
        },
        (status) => {
          if (status.metering !== undefined) {
            const level = Math.max(0.1, (status.metering + 60) / 60);
            setMetering(prev => [...prev, level].slice(-28));
          }
        },
        100
      );

      setRecording(recording);
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Recording Error', 'Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = async () => {
    try {
      console.log('Stopping recording..');
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('Recording stopped and stored at', uri);
      setRecording(null);
      await sendAudioToBackend(uri);
    } catch (err) {
      console.error('Failed to stop recording:', err);
      Alert.alert('Recording Error', 'Failed to stop recording');
    }
  };

  const cancelRecording = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
      }
      setRecording(null);
      setIsRecording(false);
      setMetering([]);
    } catch (err) {
      console.error('Failed to cancel recording:', err);
    }
  };

  const sendAudioToBackend = async (uri) => {
    try {
      setIsLoading(true);
      setTranscript('');

      const formData = new FormData();
      formData.append('audio', {
        uri,
        name: 'recording.mp3',
        type: 'audio/mp3',
      });

      const response = await axios.post(`http://${myip}:3000/transcribe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 45000,
        maxContentLength: 50 * 1024 * 1024,
        maxBodyLength: 50 * 1024 * 1024
      });

      if (response.data.status === 'success') {
        setTranscript(response.data.transcript);
        if (response.data.tasks && response.data.tasks.length > 0) {
          const updatedTasks = [...response.data.tasks, ...tasks];
          saveTasks(updatedTasks);
        }
      } else {
        Alert.alert('Processing Error', response.data.error || 'Failed to analyze audio');
      }
    } catch (error) {
      console.error('Error details:', error.response?.data || error.message);
      Alert.alert(
        'Connection Error',
        'Could not reach backend at ' + myip + ':3000. Please verify your computer and phone are on the same Wi-Fi.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTask = (taskId) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    saveTasks(updatedTasks);
  };

  const EditModal = () => {
    if (!editingTask) return null;
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Task</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <Text style={styles.inputLabel}>Task Description</Text>
              <TextInput
                style={styles.editInput}
                value={editingTask.task}
                onChangeText={(text) => setEditingTask({ ...editingTask, task: text })}
                placeholder="What needs to be done?"
                placeholderTextColor="#475569"
              />

              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.editInput}
                value={editingTask.date}
                onChangeText={(text) => setEditingTask({ ...editingTask, date: text })}
                placeholder="e.g. Tomorrow, Monday, 2026-08-15"
                placeholderTextColor="#475569"
              />

              <Text style={styles.inputLabel}>Time</Text>
              <TextInput
                style={styles.editInput}
                value={editingTask.time}
                onChangeText={(text) => setEditingTask({ ...editingTask, time: text })}
                placeholder="e.g. 3:00 PM, Morning"
                placeholderTextColor="#475569"
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  const updatedTasks = tasks.map(t => t.id === editingTask.id ? editingTask : t);
                  saveTasks(updatedTasks);
                  setIsEditModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const pendingCount = tasks.length - completedCount;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1D" />

      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>VoiceTask AI</Text>
          <Text style={styles.subtitle}>
            {tasks.length === 0 ? 'Speak to create tasks' : `${pendingCount} pending · ${completedCount} completed`}
          </Text>
        </View>
        {tasks.length > 0 && (
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{tasks.length} Total</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* Latest Transcript */}
        {transcript ? (
          <View style={[styles.section, styles.transcriptSection]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles" size={16} color="#06B6D4" style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: '#06B6D4' }]}>AI Transcript</Text>
            </View>
            <Text style={styles.transcriptText}>"{transcript}"</Text>
          </View>
        ) : null}

        {/* Tasks Section */}
        <View style={styles.tasksHeader}>
          <Text style={styles.tasksTitle}>Your Action Items</Text>
          {tasks.length > 0 && (
            <TouchableOpacity onPress={clearAllTasks}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="mic-outline" size={32} color="#14B8A6" />
            </View>
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the microphone below and speak naturally to capture voice tasks.
            </Text>
          </View>
        ) : (
          tasks.map(task => {
            const isDone = task.status === 'completed';
            return (
              <View
                key={task.id}
                style={[styles.todoItem, isDone && styles.todoItemCompleted]}
              >
                {/* Complete Checkbox */}
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => toggleTaskStatus(task.id)}
                >
                  <Ionicons
                    name={isDone ? "checkbox" : "square-outline"}
                    size={22}
                    color={isDone ? "#10B981" : "#64748B"}
                  />
                </TouchableOpacity>

                {/* Content */}
                <View style={styles.taskContent}>
                  <Text style={[styles.itemText, isDone && styles.itemTextCompleted]}>
                    {task.task}
                  </Text>
                  <View style={styles.tagRow}>
                    {task.date && task.date !== "No date" && (
                      <View style={styles.tagPill}>
                        <Ionicons name="calendar-outline" size={11} color="#38BDF8" />
                        <Text style={styles.tagText}>{task.date}</Text>
                      </View>
                    )}
                    {task.time && task.time !== "No time" && (
                      <View style={[styles.tagPill, styles.tagPillTime]}>
                        <Ionicons name="time-outline" size={11} color="#4ADE80" />
                        <Text style={[styles.tagText, styles.tagTextTime]}>{task.time}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setEditingTask(task);
                      setIsEditModalVisible(true);
                    }}
                  >
                    <Feather name="edit-2" size={16} color="#38BDF8" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteTask(task.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#F87171" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14B8A6" />
          <Text style={styles.loadingText}>Analyzing voice command...</Text>
        </View>
      )}

      {/* Waveform Recording Meter */}
      {isRecording && (
        <View style={styles.waveformContainer}>
          <View style={styles.waveformBox}>
            {metering.map((level, i) => (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  { height: Math.max(6, Math.min(36, 6 + level * 30)) }
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Bottom Floating Microphone Trigger */}
      <View style={styles.bottomButtonContainer}>
        <View style={styles.buttonRow}>
          {isRecording ? (
            <>
              <TouchableOpacity
                style={[styles.recordButton, styles.stopButton]}
                onPress={stopRecording}
              >
                <Ionicons name="stop" size={20} color="#FFFFFF" />
                <Text style={styles.recordButtonText}>Stop & Transcribe</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelRecordButton}
                onPress={cancelRecording}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.recordButton}
              onPress={startRecording}
            >
              <Ionicons name="mic" size={22} color="#FFFFFF" />
              <Text style={styles.recordButtonText}>Start Recording</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <EditModal />
    </View>
  );
}