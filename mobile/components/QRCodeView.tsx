import React, { useEffect, useState } from "react";
import { View, Image, ActivityIndicator, StyleSheet, Text } from "react-native";
import QRCode from "qrcode";

interface QRCodeViewProps {
  value: string;
  size?: number;
  backgroundColor?: string;
  color?: string;
}

export const QRCodeView: React.FC<QRCodeViewProps> = ({
  value,
  size = 180,
  backgroundColor = "#FFFFFF",
  color = "#000000"
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (!value) return;

    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: color,
        light: backgroundColor
      }
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setError(null);
        }
      })
      .catch((err) => {
        console.warn("Failed generating visual QR code:", err);
        if (isMounted) setError("Failed to generate QR");
      });

    return () => {
      isMounted = false;
    };
  }, [value, size, backgroundColor, color]);

  if (error) {
    return (
      <View style={[styles.container, { width: size, height: size, backgroundColor }]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!dataUrl) {
    return (
      <View style={[styles.container, { width: size, height: size, backgroundColor }]}>
        <ActivityIndicator size="small" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size + 16, height: size + 16, backgroundColor }]}>
      <Image
        source={{ uri: dataUrl }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel="Silage Audit QR Code"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    textAlign: "center"
  }
});

export default QRCodeView;
