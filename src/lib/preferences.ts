/**
 * Shape of the user's event-gathering preferences shown (and edited) on the
 * Configuration page. The data itself lives per-user in the `preferences`
 * table; this module only defines its type.
 */

export interface PreferenceItem {
  label: string;
  detail?: string;
}

export interface PreferenceSection {
  title: string;
  note?: string;
  items: PreferenceItem[];
  /** Shown when `items` is empty, e.g. "None yet." */
  emptyText?: string;
}

export interface Preferences {
  intro: string;
  sections: PreferenceSection[];
}
