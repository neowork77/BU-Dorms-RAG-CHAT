"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { CropModal } from "./CropModal";
import { LoadingScreen } from "./LoadingScreen";

type ThemeOption = "light" | "dark";

const themeOptions: { value: ThemeOption; icon: string; label: string }[] = [
  { value: "light", icon: "light_mode", label: "Light" },
  { value: "dark", icon: "dark_mode", label: "Dark" },
];

export function SettingsContent() {
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setSelectedImageSrc(objectUrl);
    
    // Clear input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploadingAvatar(true);
    
    // Close modal
    const imgSrcToRevoke = selectedImageSrc;
    setSelectedImageSrc(null);

    try {
      // 1. Upload to Supabase Storage
      if (!user) throw new Error("No user found");
      const filePath = `${user.id}/${Date.now()}.webp`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // 3. Update User Metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      // Update local state
      setUser({
        ...user,
        user_metadata: { ...user.user_metadata, avatar_url: publicUrl }
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      if (imgSrcToRevoke) URL.revokeObjectURL(imgSrcToRevoke);
    }
  };

  // Fetch user on mount
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        setEditedName(
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          ""
        );
      }
      setLoading(false);
    };
    getUser();
  }, [supabase]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    // Re-route will be handled via LoadingScreen's onComplete prop
  };

  const handleSaveProfile = async () => {
    if (!editedName.trim()) return;
    setIsSavingProfile(true);
    setSaveSuccess(false);
    
    const { error } = await supabase.auth.updateUser({
      data: { full_name: editedName.trim() }
    });
    
    if (!error) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      
      // Update local user state so UI reflects the change immediately
      if (user) {
        setUser({
          ...user,
          user_metadata: { ...user.user_metadata, full_name: editedName.trim() }
        });
      }
    } else {
      console.error("Error updating profile:", error.message);
    }
    
    setIsSavingProfile(false);
  };

  // Extract profile data
  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null;
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "";
  const email = user?.email || "";

  return (
    <>
      {signingOut && (
        <LoadingScreen 
          message="กำลังออกจากระบบ..." 
          onComplete={() => router.replace("/")}
          durationInMs={1000}
        />
      )}
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto w-full max-w-5xl mx-auto px-6 py-10 pb-32 md:pb-12 space-y-10 md:space-y-12">
        {/* Page Title */}
        <div className="space-y-1 md:space-y-2 shrink-0">
          <h2 className="text-[36px] leading-[1.2] tracking-[-0.02em] font-[800] text-on-surface">
            Settings
          </h2>
          <p className="text-[18px] leading-[1.6] font-medium text-on-surface-variant">
            Manage your account, preferences, and aesthetic choices.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* PROFILE SECTION */}
          <section className="col-span-1 md:col-span-12 bg-surface-container-lowest rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.06)] px-6 pt-6 pb-10 border border-surface-container-low relative transition-all duration-300">
            <div className="absolute top-0 left-0 w-2 h-full bg-primary-container rounded-l-xl" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pl-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-surface-container shadow-sm bg-surface-variant flex items-center justify-center">
                  {loading ? (
                    <div className="w-full h-full bg-surface-container-low animate-pulse" />
                  ) : avatarUrl ? (
                    <img
                      alt="User Avatar"
                      className="w-full h-full object-cover"
                      src={avatarUrl}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span
                      className="material-symbols-outlined text-5xl text-on-surface-variant"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      person
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform border-2 border-surface-container-lowest disabled:opacity-70 disabled:hover:scale-100 disabled:active:scale-100 cursor-pointer disabled:cursor-not-allowed"
                >
                  {uploadingAvatar ? (
                    <span className="w-3 h-3 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  )}
                </button>
              </div>
              {/* Profile Info */}
              <div className="flex-1 w-full space-y-4">
                <div>
                  <h3 className="text-[24px] leading-[1.3] font-bold text-on-surface">Profile Identity</h3>
                  <p className="text-sm text-on-surface-variant">How Puffin AI addresses you.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[12px] leading-none tracking-[0.05em] font-semibold uppercase text-on-surface-variant ml-2 font-[family-name:var(--font-lexend)]">
                      Display Name
                    </label>
                    {loading ? (
                      <div className="w-full h-12 bg-surface-container-low rounded-full animate-pulse" />
                    ) : (
                      <input
                        className="w-full bg-surface-container-low border-none rounded-full px-5 py-3 text-[16px] text-on-surface focus:ring-2 focus:ring-primary-container outline-none transition-shadow"
                        placeholder="Your name"
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[12px] leading-none tracking-[0.05em] font-semibold uppercase text-on-surface-variant ml-2 font-[family-name:var(--font-lexend)]">
                      Email
                    </label>
                    {loading ? (
                      <div className="w-full h-12 bg-surface-container-low rounded-full animate-pulse" />
                    ) : (
                      <input
                        className="w-full bg-surface-container-low border-none rounded-full px-5 py-3 text-[16px] text-on-surface-variant focus:ring-2 focus:ring-primary-container outline-none transition-shadow opacity-70 cursor-not-allowed"
                        disabled
                        type="email"
                        defaultValue={email}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button 
                onClick={handleSaveProfile}
                disabled={isSavingProfile || !editedName.trim()}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-on-primary transition-all font-medium text-sm shadow-sm active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  saveSuccess ? "bg-primary" : "bg-primary hover:opacity-90"
                }`}
              >
                {isSavingProfile ? (
                  <>
                    <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    Saved!
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </section>

          {/* PREFERENCES (12 cols) */}
          <section className="col-span-1 md:col-span-12 bg-surface-container-lowest rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.06)] p-6 border border-surface-container-low flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-surface-container-low pb-4">
              <div className="w-10 h-10 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container">
                <span className="material-symbols-outlined">palette</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-on-surface">Preferences</h3>
                <p className="text-sm text-on-surface-variant">Customize your experience.</p>
              </div>
            </div>
            <div className="space-y-6 flex-1">
              {/* Theme Selection */}
              <div className="space-y-3">
                <label className="text-[12px] leading-none tracking-[0.05em] font-semibold uppercase text-on-surface-variant ml-1 font-[family-name:var(--font-lexend)]">
                  Theme
                </label>
                <div className="flex flex-wrap gap-3">
                  {themeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setTheme(opt.value)}
                      className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        theme === opt.value
                          ? "bg-primary-container text-on-primary-container border-2 border-primary/20"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container border-2 border-transparent"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Sign Out Button */}
            <div className="mt-4 pt-6 border-t border-surface-container-low">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full md:w-auto ml-auto flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-error-container/50 text-on-error-container hover:bg-error-container transition-colors font-medium text-sm active:scale-95 cursor-pointer disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                {signingOut ? "logging out…" : "Logout"}
              </button>
            </div>
          </section>
        </div>
      </div>
      {/* Crop Modal */}
      {selectedImageSrc && (
        <CropModal
          imageSrc={selectedImageSrc}
          onClose={() => {
            setSelectedImageSrc(null);
            URL.revokeObjectURL(selectedImageSrc);
          }}
          onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
}
