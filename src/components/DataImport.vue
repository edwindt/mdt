<template>
  <v-card flat>
    <v-card-title>Import Data</v-card-title>
    <v-card-text>
      <v-btn @click="triggerFileInput">Import from Excel</v-btn>
      <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none;" />
    </v-card-text>
    <v-dialog v-model="showSeriesNameDialog" max-width="500px">
      <v-card>
        <v-card-title class="headline">Enter Data Series Name</v-card-title>
        <v-card-text>
          <v-text-field v-model="dataSeriesName" label="Data Series Name" />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="confirmSeriesName">Confirm</v-btn>
          <v-btn @click="showSeriesNameDialog = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script>
import * as XLSX from 'xlsx';

export default {
  data() {
    return {
      showSeriesNameDialog: false,
      dataSeriesName: '',
      importedData: [],
    };
  },
  methods: {
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, {type: 'array'});
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
          this.importedData = jsonData.slice(1).map(row => ({x: row[0], y: row[1]}));
          this.showSeriesNameDialog = true;
        };
        reader.readAsArrayBuffer(file);
      }
    },
    confirmSeriesName() {
      if (this.dataSeriesName && !this.isSeriesNameInUse(this.dataSeriesName)) {
        this.$emit('imported', {name: this.dataSeriesName, data: this.importedData});
        this.showSeriesNameDialog = false;
        this.dataSeriesName = '';
      } else {
        alert('Data series name must be unique and not empty.');
      }
    },
    isSeriesNameInUse(name) {
      return this.$emit('check-series-name', name);
    },
  },
};
</script>
