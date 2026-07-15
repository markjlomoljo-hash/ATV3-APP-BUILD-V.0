import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "../../src/lib/supabase";
import { Button, Input } from "../../src/components/ui";
import { Colors, Spacing, Typography, BorderRadius } from "../../src/components/ui/theme";

const schema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export default function SignUpScreen() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: FormData) => {
    setAuthError(null);
    const { error } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        emailRedirectTo: "acnetrex://auth/confirm",
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setAuthError(
          "An account with this email already exists. Please sign in instead."
        );
      } else {
        setAuthError(error.message);
      }
      return;
    }

    setEmailSent(true);
  };

  if (emailSent) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.confirmContainer}>
          <Text style={styles.confirmIcon}>✉️</Text>
          <Text style={styles.confirmTitle}>Check Your Email</Text>
          <Text style={styles.confirmText}>
            We sent a confirmation link to your email address. Click it to
            activate your account and begin onboarding.
          </Text>
          <Button
            title="Back to Sign In"
            onPress={() => router.replace("/auth/sign-in")}
            style={{ marginTop: Spacing.xl }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.eyebrow}>GET STARTED</Text>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Your skin data is private and owned by you. AcneTrex does not
              share raw health data without your explicit consent.
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email Address"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="At least 8 characters"
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirm Password"
                  placeholder="Repeat your password"
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            {authError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            <View style={styles.privacyNote}>
              <Text style={styles.privacyText}>
                By creating an account you acknowledge that AcneTrex is not a
                medical device and does not provide diagnoses or prescriptions.
              </Text>
            </View>

            <Button
              title="Create Account"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.replace("/auth/sign-in")}>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  backButton: { paddingVertical: Spacing.sm, marginBottom: Spacing.sm },
  backText: { ...Typography.bodyMedium, color: Colors.primary },
  header: { marginBottom: Spacing.xl },
  eyebrow: { ...Typography.eyebrow, color: Colors.primary, letterSpacing: 2, marginBottom: 4 },
  title: { ...Typography.largeTitle, color: Colors.textPrimary, marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22 },
  form: { gap: 0 },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: { ...Typography.body, color: Colors.error },
  privacyNote: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  privacyText: { ...Typography.caption, color: Colors.primaryDark, lineHeight: 18 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.xl,
  },
  footerText: { ...Typography.body, color: Colors.textSecondary },
  footerLink: { ...Typography.bodyMedium, color: Colors.primary },
  confirmContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  confirmIcon: { fontSize: 64, marginBottom: Spacing.lg },
  confirmTitle: { ...Typography.title1, color: Colors.textPrimary, textAlign: "center", marginBottom: Spacing.md },
  confirmText: { ...Typography.body, color: Colors.textSecondary, textAlign: "center", lineHeight: 24 },
});
