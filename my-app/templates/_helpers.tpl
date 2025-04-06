{{/* Generate basic labels */}}
{{- define "my-app.labels" -}}
app: {{ .Chart.Name }}
release: {{ .Release.Name }}
{{- end -}}