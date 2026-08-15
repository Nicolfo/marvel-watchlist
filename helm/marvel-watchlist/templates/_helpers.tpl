{{/* Expand the name of the chart. */}}
{{- define "marvel-watchlist.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Fully qualified app name. */}}
{{- define "marvel-watchlist.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "marvel-watchlist.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "marvel-watchlist.labels" -}}
helm.sh/chart: {{ include "marvel-watchlist.chart" . }}
{{ include "marvel-watchlist.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "marvel-watchlist.selectorLabels" -}}
app.kubernetes.io/name: {{ include "marvel-watchlist.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "marvel-watchlist.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "marvel-watchlist.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/* Name of the Secret holding DATABASE_URL, if any. */}}
{{- define "marvel-watchlist.databaseSecretName" -}}
{{- if .Values.database.existingSecret }}
{{- .Values.database.existingSecret }}
{{- else }}
{{- printf "%s-db" (include "marvel-watchlist.fullname" .) }}
{{- end }}
{{- end }}

{{/* Name of the Secret holding TMDB_API_KEY, if any. */}}
{{- define "marvel-watchlist.tmdbSecretName" -}}
{{- if .Values.tmdb.existingSecret }}
{{- .Values.tmdb.existingSecret }}
{{- else }}
{{- printf "%s-tmdb" (include "marvel-watchlist.fullname" .) }}
{{- end }}
{{- end }}

{{/* Whether a TMDB credential is configured by either route. */}}
{{- define "marvel-watchlist.tmdbEnabled" -}}
{{- if or .Values.tmdb.apiKey .Values.tmdb.existingSecret }}true{{ end }}
{{- end }}
