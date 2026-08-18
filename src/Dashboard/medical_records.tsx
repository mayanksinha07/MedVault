import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Clock3,
  Download,
  Eye,
  FileText,
  Folder,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import AppSidebar from "../components/AppSidebar";

interface RecordCategory {
  title: string;
  files: number;
  sizeMb: number;
  lastUpdated: string;
}

interface MedicalRecord {
  _id: string;
  title: string;
  category: string;
  notes: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const getAuthToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const clearSessionAndRedirect = () => {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
  window.location.assign("/");
};

const fallbackCategories: RecordCategory[] = [
  {
    title: "X-Ray",
    files: 15,
    sizeMb: 20.3,
    lastUpdated: "2026-04-12",
  },
  {
    title: "Diagnostic Reports",
    files: 5,
    sizeMb: 17.5,
    lastUpdated: "2026-04-08",
  },
  {
    title: "Medication Reports",
    files: 27,
    sizeMb: 32.4,
    lastUpdated: "2026-04-10",
  },
  {
    title: "Blood Test Reports",
    files: 25,
    sizeMb: 25.6,
    lastUpdated: "2026-04-11",
  },
  {
    title: "Lab Tests",
    files: 16,
    sizeMb: 18.2,
    lastUpdated: "2026-04-09",
  },
  {
    title: "Other Reports",
    files: 10,
    sizeMb: 12.1,
    lastUpdated: "2026-04-05",
  },
];

const fallbackRecords: MedicalRecord[] = [
  {
    _id: "local-1",
    title: "Cardiac ECG Report",
    category: "Diagnostic Reports",
    notes: "Follow-up summary",
    fileName: "Cardiac_ECG_Report_Apr.pdf",
    fileUrl: "",
    mimeType: "application/pdf",
    size: 2.4 * 1024 * 1024,
    createdAt: "2026-04-12",
  },
  {
    _id: "local-2",
    title: "Blood Panel Q1",
    category: "Blood Test Reports",
    notes: "Quarterly panel",
    fileName: "BloodPanel_Q1_2026.pdf",
    fileUrl: "",
    mimeType: "application/pdf",
    size: 1.8 * 1024 * 1024,
    createdAt: "2026-04-11",
  },
];

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toMb = (bytes: number) => Number((bytes / (1024 * 1024)).toFixed(2));

const readErrorMessage = async (response: Response, fallback: string) => {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message || fallback;
  } catch {
    return fallback;
  }
};

const isUnauthorized = (response: Response) => response.status === 401;

const getCategoryAccent = (category: string) => {
  const key = category.toLowerCase();
  if (key.includes("x-ray") || key.includes("xray")) {
    return "bg-sky-100 text-sky-700";
  }
  if (key.includes("diagnostic")) {
    return "bg-indigo-100 text-indigo-700";
  }
  if (key.includes("medication") || key.includes("med")) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (key.includes("blood")) {
    return "bg-rose-100 text-rose-700";
  }
  if (key.includes("lab")) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
};

const Records = () => {
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [categories, setCategories] = useState<RecordCategory[]>(fallbackCategories);
  const [records, setRecords] = useState<MedicalRecord[]>(fallbackRecords);
  const [uploading, setUploading] = useState(false);
  const [deletingRecordIds, setDeletingRecordIds] = useState<string[]>([]);
  const [notice, setNotice] = useState(
    "All medical records are encrypted and backed up in your personal vault."
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBackendData = async () => {
    if (!API_URL) {
      setNotice("Using local records. Add VITE_API_URL to connect backend.");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setNotice("Sign in to sync records from backend.");
      return;
    }

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [recordsResponse, categoriesResponse] = await Promise.all([
        fetch(`${API_URL}/records`, { headers }),
        fetch(`${API_URL}/records/categories`, { headers }),
      ]);

      if (isUnauthorized(recordsResponse) || isUnauthorized(categoriesResponse)) {
        setNotice("Session expired. Please sign in again.");
        clearSessionAndRedirect();
        return;
      }

      if (!recordsResponse.ok || !categoriesResponse.ok) {
        const message = !recordsResponse.ok
          ? await readErrorMessage(recordsResponse, "Failed to load records")
          : await readErrorMessage(
              categoriesResponse,
              "Failed to load categories"
            );
        throw new Error(message);
      }

      const recordsData = (await recordsResponse.json()) as MedicalRecord[];
      const categoriesData = (await categoriesResponse.json()) as RecordCategory[];

      setRecords(recordsData);
      setCategories(categoriesData.length ? categoriesData : fallbackCategories);
      setNotice("Records synced from backend.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not sync records from backend. Showing local data.";
      setNotice(message);
    }
  };

  useEffect(() => {
    void loadBackendData();
  }, []);

  const categoryOptions = useMemo(
    () => ["All", ...categories.map((item) => item.title)],
    [categories]
  );

  const totalFiles = useMemo(
    () => categories.reduce((sum, item) => sum + item.files, 0),
    [categories]
  );

  const totalStorageMb = useMemo(
    () => categories.reduce((sum, item) => sum + item.sizeMb, 0),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return categories.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.lastUpdated.toLowerCase().includes(query);
      const matchesCategory =
        activeCategory === "All" || item.title === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [activeCategory, categories, searchText]);

  const filteredRecords = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return records.filter((item) => {
      const matchesSearch =
        item.fileName.toLowerCase().includes(query) ||
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.notes.toLowerCase().includes(query);

      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [activeCategory, records, searchText]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    if (!API_URL) {
      setNotice("Backend API URL is missing. Add VITE_API_URL first.");
      event.target.value = "";
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setNotice("Please sign in again to upload records.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append(
        "category",
        activeCategory === "All" ? "Other Reports" : activeCategory
      );
      formData.append("title", selectedFile.name);
      formData.append("notes", "Uploaded from Medical Records");

      const response = await fetch(`${API_URL}/records/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (isUnauthorized(response)) {
        setNotice("Session expired. Please sign in again.");
        clearSessionAndRedirect();
        return;
      }

      if (!response.ok) {
        const message = await readErrorMessage(response, "Upload failed");
        throw new Error(message);
      }

      setNotice("Record uploaded successfully.");
      await loadBackendData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed. Please try again.";
      setNotice(message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const openRecord = (record: MedicalRecord) => {
    if (!record.fileUrl || !API_URL) {
      setNotice(`Preview is unavailable for ${record.fileName}.`);
      return;
    }

    window.open(`${API_URL}${record.fileUrl}`, "_blank", "noopener,noreferrer");
  };

  const downloadRecord = (record: MedicalRecord) => {
    if (!record.fileUrl || !API_URL) {
      setNotice(`Download is unavailable for ${record.fileName}.`);
      return;
    }

    window.open(`${API_URL}${record.fileUrl}`, "_blank", "noopener,noreferrer");
  };

  const handleDeleteRecord = async (record: MedicalRecord) => {
    const recordId = record._id;
    setDeletingRecordIds((current) => [...current, recordId]);

    if (!API_URL || recordId.startsWith("local-")) {
      setRecords((current) => current.filter((item) => item._id !== recordId));
      setNotice(`Removed ${record.fileName}.`);
      setDeletingRecordIds((current) => current.filter((id) => id !== recordId));
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setNotice("Session expired. Please sign in again.");
      clearSessionAndRedirect();
      return;
    }

    try {
      const response = await fetch(`${API_URL}/records/${recordId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (isUnauthorized(response)) {
        setNotice("Session expired. Please sign in again.");
        clearSessionAndRedirect();
        return;
      }

      if (!response.ok) {
        const message = await readErrorMessage(response, "Delete failed");
        throw new Error(message);
      }

      setNotice(`Deleted ${record.fileName}.`);
      await loadBackendData();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Delete failed. Please try again.";
      setNotice(message);
    } finally {
      setDeletingRecordIds((current) => current.filter((id) => id !== recordId));
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      <AppSidebar active="records" />

      <main className="flex-1 p-6 overflow-y-auto">
        <section className="rounded-3xl bg-gradient-to-r from-emerald-700 via-cyan-700 to-sky-600 p-8 text-white shadow-lg">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-100">
                Medical Vault
              </p>
              <h1 className="mt-2 text-3xl font-bold">Record Management Center</h1>
              <p className="mt-2 max-w-2xl text-sm text-cyan-50">
                Organize and secure reports, track sync status, and keep every
                document ready for appointments and emergency care.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Upload size={18} />
              {uploading ? "Uploading..." : "Upload Record"}
            </button>
          </div>
        </section>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
        />

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-gray-500">Total Files</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{totalFiles}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-gray-500">Storage Used</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {totalStorageMb.toFixed(2)} MB
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-gray-500">Security Layer</p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
              <ShieldCheck size={15} />
              Encrypted + Synced
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={handleSearchChange}
                placeholder="Search by file, category or notes"
                className="ml-3 w-full bg-transparent outline-none text-sm"
              />
            </div>

            <select
              value={activeCategory}
              onChange={(event) => setActiveCategory(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-bold text-slate-900">Record Categories</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCategories.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100"
              >
                <div className="flex items-start justify-between">
                  <div className={`rounded-2xl p-3 ${getCategoryAccent(item.title)}`}>
                    <Folder size={18} />
                  </div>
                  <span className="text-sm text-slate-500">
                    {formatDate(item.lastUpdated)}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {item.files} files | {item.sizeMb.toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={() => setActiveCategory(item.title)}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  <FileText size={14} />
                  Open Folder
                </button>
              </article>
            ))}
          </div>

          {filteredCategories.length === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              No categories match your current search/filter.
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recent Records</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {filteredRecords.length} files
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {filteredRecords.map((item) => (
              <div
                key={item._id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{item.fileName}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.category} | {toMb(item.size)} MB
                      {item.notes ? ` | ${item.notes}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                      <Clock3 size={12} />
                      {formatDate(item.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openRecord(item)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                    >
                      <Eye size={14} />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadRecord(item)}
                      className="inline-flex items-center gap-1 rounded-xl bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
                    >
                      <Download size={14} />
                      Download
                    </button>
                    <button
                      type="button"
                      disabled={deletingRecordIds.includes(item._id)}
                      onClick={() => handleDeleteRecord(item)}
                      className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                    >
                      <Trash2 size={14} />
                      {deletingRecordIds.includes(item._id) ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredRecords.length === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              No recent records found for this filter.
            </div>
          )}
        </section>

        <div className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-800">
          <p className="text-sm">{notice}</p>
        </div>
      </main>
    </div>
  );
};

export default Records;
