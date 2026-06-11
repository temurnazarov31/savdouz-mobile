import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Colors from "../constants/colors";

export default function Dropdown({
  options,
  selected,
  onSelect,
  placeholder,
  selector,
  icon,
}) {
  const [visible, setVisible] = useState(false);

  const selectedLabel =
    options.find((o) => o.value === selected)?.label || placeholder;

  return (
    <>
      <TouchableOpacity style={selector} onPress={() => setVisible(true)}>
        <TouchableOpacity style={styles.selectorTitle}>
          <Text style={[styles.selectorText, !selected && styles.placeholder]}>
            {selectedLabel}
          </Text>
          {icon}
        </TouchableOpacity>
        <Ionicons name="chevron-down" size={16} color={Colors.textLight} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setVisible(false)}
        >
          <View style={styles.dropdown}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === selected && styles.optionActive,
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    setVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === selected && styles.optionTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === selected && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={Colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorTitle: {
    flexDirection: "row",
  },
  selectorText: { fontSize: 16, color: Colors.text },
  placeholder: { color: Colors.textLight },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  dropdown: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: 300,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionActive: { backgroundColor: Colors.primary + "10" },
  optionText: { fontSize: 16, color: Colors.text },
  optionTextActive: { color: Colors.primary, fontWeight: "600" },
});
