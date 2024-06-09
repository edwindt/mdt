<template>
  <div>
    <v-app-bar app>
      <v-toolbar-title>Chart Application</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn @click="openImportDialog">
        <v-icon left>mdi-folder-open</v-icon> Import Data
      </v-btn>
    </v-app-bar>

    <v-container>
      <v-row>
        <v-col>
          <v-card outlined class="mt-5">
            <v-card-title>Chart Controls</v-card-title>
            <v-card-text>
              <div class="button-container">
                <v-btn class="button" small @click="toggleVerticalDragDrop" :class="{ active: verticalDragDropEnabled }">
                  <v-icon left small>mdi-arrow-up-down-bold</v-icon>
                  Move Up & Down
                </v-btn>
                <v-btn class="button" small @click="toggleHorizontalDragDrop" :class="{ active: horizontalDragDropEnabled }">
                  <v-icon left small>mdi-arrow-left-right-bold</v-icon>
                  Move Left & Right
                </v-btn>
                <v-btn class="button" small @click="toggleFreeDragDrop" :class="{ active: freeDragDropEnabled }">
                  <v-icon left small>mdi-cursor-move</v-icon>
                  Move Freely
                </v-btn>
                <v-btn class="button" small @click="toggleExtendMode" :class="{ active: extendModeEnabled }">
                  <v-icon left small>mdi-arrow-expand-horizontal</v-icon>
                  Extend Fit Line
                </v-btn>
                <v-btn class="button-save" small @click="showSaveDialog = true">
                  <v-icon left small>mdi-content-save</v-icon>
                  Save Plot
                </v-btn>
                <v-btn class="button-load" small @click="showLoadDialog = true">
                  <v-icon left small>mdi-folder-open</v-icon>
                  Load Plot
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <v-col>
          <v-card class="mt-5">
            <v-card-title>Chart</v-card-title>
            <v-card-text>
              <div ref="chart" style="width: 100%; height: 500px;"></div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <v-dialog v-model="showSaveDialog" max-width="500px">
      <v-card>
        <v-card-title class="headline">Save Plot</v-card-title>
        <v-card-text>
          <v-text-field v-model="fileName" label="File Name" />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="savePlot">Save</v-btn>
          <v-btn @click="showSaveDialog = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showLoadDialog" max-width="500px">
      <v-card>
        <v-card-title class="headline">Load Plot</v-card-title>
        <v-card-text>
          <input type="file" ref="fileInput" @change="handleFileUpload" />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showLoadDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showModal" max-width="500px">
      <v-card>
        <v-card-title class="headline">Enter Best Fit Line Name</v-card-title>
        <v-card-text>
          <v-text-field v-model="bestFitLineName" label="Best Fit Line Name" />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="confirmBestFitLineName">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showImportDialog" max-width="500px">
      <v-card>
        <v-card-title class="headline">Import Data</v-card-title>
        <v-card-text>
          <data-import @imported="handleImportedData" @check-series-name="isSeriesNameInUse" />
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showImportDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, reactive } from 'vue';
import * as echarts from 'echarts';
import DataImport from './DataImport.vue';

export default {
  components: {
    DataImport,
  },
  setup() {
    const chart = ref(null);
    const showSaveDialog = ref(false);
    const showLoadDialog = ref(false);
    const showModal = ref(false);
    const showImportDialog = ref(false);
    const fileName = ref('');
    const bestFitLineName = ref('');
    const selectedPoints = ref([]);
    const verticalDragDropEnabled = ref(false);
    const horizontalDragDropEnabled = ref(false);
    const freeDragDropEnabled = ref(false);
    const extendModeEnabled = ref(false);
    const fileInput = ref(null);
    let myChart = null;
    let currentDraggingLine = null;
    let dragStartX = null;
    let dragStartY = null;
    let extendingLine = false;
    let extendingPointIndex = null;
    const fitLines = reactive([]);
    const seriesNames = ref([]);
    let fitLineCounter = 1;

    const throttle = (func, delay) => {
      let lastCall = 0;
      return (...args) => {
        const now = new Date().getTime();
        if (now - lastCall < delay) {
          return;
        }
        lastCall = now;
        return func(...args);
      };
    };

    const initChart = () => {
      myChart = echarts.init(chart.value);
      const option = {
        xAxis: {
          type: 'value',
        },
        yAxis: {
          type: 'value',
        },
        series: [],
        toolbox: {
          feature: {
            magicType: {
              type: ['stack'],
            },
            dataView: {},
          },
        },
        tooltip: {},
        brush: {
          toolbox: ['rect', 'polygon', 'lineX', 'lineY', 'keep', 'clear'],
          brushMode: 'single',
          transformable: true,
          seriesIndex: 'all',
        },
        legend: {
          data: [],
          bottom: 10,
        },
      };

      myChart.setOption(option);
      myChart.on('brushSelected', onBrushSelected);
      myChart.getZr().on('mousedown', onMouseDown);
      myChart.getZr().on('mousemove', throttle(onMouseMove, 50));
      myChart.getZr().on('mouseup', onMouseUp);
    };

    const onBrushSelected = (params) => {
      const brushComponent = params.batch[0];
      selectedPoints.value = [];

      for (let sIdx = 0; sIdx < brushComponent.selected.length; sIdx++) {
        const rawIndices = brushComponent.selected[sIdx].dataIndex;
        const data = myChart.getOption().series[sIdx].data;
        rawIndices.forEach((index) => {
          selectedPoints.value.push(data[index]);
        });
      }
    };

    const calculateBestFitLine = (points) => {
      const n = points.length;
      const sumX = points.reduce((sum, point) => sum + point[0], 0);
      const sumY = points.reduce((sum, point) => sum + point[1], 0);
      const sumXY = points.reduce((sum, point) => sum + point[0] * point[1], 0);
      const sumX2 = points.reduce((sum, point) => sum + point[0] * point[0], 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      return { slope, intercept };
    };

    const plotBestFitLine = (name) => {
      const { slope, intercept } = calculateBestFitLine(selectedPoints.value);
      const xMin = Math.min(...selectedPoints.value.map((point) => point[0]));
      const xMax = Math.max(...selectedPoints.value.map((point) => point[0]));
      const yMax = slope * xMax + intercept;

      const bestFitLine = [
        [xMin, slope * xMin + intercept],
        [xMax, yMax],
      ];

      const currentOptions = myChart.getOption();
      const newSeries = [
        ...currentOptions.series,
        {
          data: bestFitLine,
          type: 'line',
          name: name,
          smooth: true,
          lineStyle: {
            type: 'dashed',
          },
        },
      ];

      const newLegend = [
        ...(currentOptions.legend[0]?.data || []),
        name,
      ];

      const newGraphic = {
        type: 'text',
        left: myChart.convertToPixel({ xAxisIndex: 0 }, xMax),
        top: myChart.convertToPixel({ yAxisIndex: 0 }, yMax),
        style: {
          text: `${name}\nSlope: ${slope.toFixed(2)}`,
          textAlign: 'center',
          fill: '#000',
          backgroundColor: '#F6F8FC',
          borderColor: '#8C8D8E',
          borderWidth: 1,
          borderRadius: 4,
          padding: [4, 8],
        },
        draggable: true,
      };

      fitLines.push({ name, graphic: newGraphic });

      myChart.setOption({
        series: newSeries,
        legend: {
          data: newLegend,
        },
        graphic: fitLines.map(fitLine => fitLine.graphic),
      });

      myChart.dispatchAction({
        type: 'brush',
        areas: [],
      });

      myChart.dispatchAction({
        type: 'takeGlobalCursor',
        key: 'brush',
        brushOption: {
          brushType: null,
        },
      });

      showModal.value = false;
    };

    const extendFitLineInteractive = (event) => {
      if (!extendModeEnabled.value || currentDraggingLine === null || extendingLine === false) return;

      const { offsetX, offsetY } = event;
      const pointInPixel = [offsetX, offsetY];
      const pointInGrid = myChart.convertFromPixel('grid', pointInPixel);

      const currentOptions = myChart.getOption();
      const series = currentOptions.series[currentDraggingLine];

      const [x1, y1] = series.data[0];
      const [x2, y2] = series.data[1];
      const slope = (y2 - y1) / (x2 - x1);

      if (extendingPointIndex === 1) {
        const newX2 = pointInGrid[0];
        const newY2 = slope * (newX2 - x1) + y1;
        series.data[1] = [newX2, newY2];
      } else {
        const newX1 = pointInGrid[0];
        const newY1 = slope * (newX1 - x2) + y2;
        series.data[0] = [newX1, newY1];
      }

      myChart.setOption({ series: currentOptions.series });
      updateFitLineLabel(fitLines[currentDraggingLine]);
    };

    const updateFitLineLabel = (fitLine) => {
      const currentOptions = myChart.getOption();
      const series = currentOptions.series.find(s => s.name === fitLine.name);
      if (!series) return;

      const [xMax, yMax] = series.data[1];

      fitLine.graphic.left = myChart.convertToPixel({ xAxisIndex: 0 }, xMax);
      fitLine.graphic.top = myChart.convertToPixel({ yAxisIndex: 0 }, yMax);
      fitLine.graphic.style.text = `${fitLine.name}\nSlope: ${calculateBestFitLine(series.data).slope.toFixed(2)}`;

      myChart.setOption({
        graphic: fitLines.map(fitLine => fitLine.graphic),
      });
    };

    const confirmBestFitLineName = () => {
      if (bestFitLineName.value && isUniqueFitLineName(bestFitLineName.value)) {
        plotBestFitLine(bestFitLineName.value);
        bestFitLineName.value = '';
        fitLineCounter++;
      } else {
        alert('Fit line name must be unique and not empty.');
      }
    };

    const generateUniqueFitLineName = () => {
      let name;
      do {
        name = `Fit Line ${fitLineCounter}`;
      } while (!isUniqueFitLineName(name));
      return name;
    };

    const isUniqueFitLineName = (name) => {
      const currentOptions = myChart.getOption();
      return !currentOptions.series.some((series) => series.name === name);
    };

    const onMouseDown = (event) => {
      if (!verticalDragDropEnabled.value && !horizontalDragDropEnabled.value && !freeDragDropEnabled.value && !extendModeEnabled.value) return;

      const { offsetX, offsetY } = event;
      const pointInPixel = [offsetX, offsetY];
      const pointInGrid = myChart.convertFromPixel('grid', pointInPixel);

      const currentOptions = myChart.getOption();
      currentOptions.series.forEach((series, index) => {
        if (series.type === 'line' && series.name !== 'markers') {
          const lineData = series.data;
          const [x1, y1] = lineData[0];
          const [x2, y2] = lineData[1];
          const slope = (y2 - y1) / (x2 - x1);
          const intercept = y1 - slope * x1;

          const distanceToLine = Math.abs(slope * pointInGrid[0] - pointInGrid[1] + intercept) / Math.sqrt(slope * slope + 1);
          if (distanceToLine < 0.5) {
            currentDraggingLine = index;
            dragStartX = pointInGrid[0];
            dragStartY = pointInGrid[1];
            if (Math.abs(pointInGrid[0] - x1) < Math.abs(pointInGrid[0] - x2)) {
              extendingPointIndex = 0;
            } else {
              extendingPointIndex = 1;
            }
            extendingLine = true;
          }
        }
      });
    };

    const onMouseMove = (event) => {
      if (extendModeEnabled.value) {
        extendFitLineInteractive(event);
        return;
      }

      if (!verticalDragDropEnabled.value && !horizontalDragDropEnabled.value && !freeDragDropEnabled.value) return;
      if (currentDraggingLine === null) return;

      const { offsetX, offsetY } = event;
      const pointInPixel = [offsetX, offsetY];
      const pointInGrid = myChart.convertFromPixel('grid', pointInPixel);

      const deltaX = pointInGrid[0] - dragStartX;
      const deltaY = pointInGrid[1] - dragStartY;

      const currentOptions = myChart.getOption();
      const series = currentOptions.series[currentDraggingLine];

      if (verticalDragDropEnabled.value) {
        series.data = series.data.map(([x, y]) => [x, y + deltaY]);
        dragStartY = pointInGrid[1];
      }
      if (horizontalDragDropEnabled.value) {
        series.data = series.data.map(([x, y]) => [x + deltaX, y]);
        dragStartX = pointInGrid[0];
      }
      if (freeDragDropEnabled.value) {
        series.data = series.data.map(([x, y]) => [x + deltaX, y + deltaY]);
        dragStartX = pointInGrid[0];
        dragStartY = pointInGrid[1];
      }

      myChart.setOption({ series: currentOptions.series });
      updateFitLineLabel(fitLines[currentDraggingLine]);
    };

    const onMouseUp = () => {
      if (selectedPoints.value.length > 0) {
        bestFitLineName.value = generateUniqueFitLineName();
        showModal.value = true;
      }

      currentDraggingLine = null;
      dragStartX = null;
      dragStartY = null;
      extendingLine = false;
      extendingPointIndex = null;
    };

    const toggleVerticalDragDrop = () => {
      verticalDragDropEnabled.value = !verticalDragDropEnabled.value;
      if (verticalDragDropEnabled.value) {
        horizontalDragDropEnabled.value = false;
        freeDragDropEnabled.value = false;
        extendModeEnabled.value = false;
      }
      if (!verticalDragDropEnabled.value) {
        currentDraggingLine = null;
        dragStartX = null;
        dragStartY = null;
      }
    };

    const toggleHorizontalDragDrop = () => {
      horizontalDragDropEnabled.value = !horizontalDragDropEnabled.value;
      if (horizontalDragDropEnabled.value) {
        verticalDragDropEnabled.value = false;
        freeDragDropEnabled.value = false;
        extendModeEnabled.value = false;
      }
      if (!horizontalDragDropEnabled.value) {
        currentDraggingLine = null;
        dragStartX = null;
        dragStartY = null;
      }
    };

    const toggleFreeDragDrop = () => {
      freeDragDropEnabled.value = !freeDragDropEnabled.value;
      if (freeDragDropEnabled.value) {
        verticalDragDropEnabled.value = false;
        horizontalDragDropEnabled.value = false;
        extendModeEnabled.value = false;
      }
      if (!freeDragDropEnabled.value) {
        currentDraggingLine = null;
        dragStartX = null;
        dragStartY = null;
      }
    };

    const toggleExtendMode = () => {
      extendModeEnabled.value = !extendModeEnabled.value;
      if (extendModeEnabled.value) {
        verticalDragDropEnabled.value = false;
        horizontalDragDropEnabled.value = false;
        freeDragDropEnabled.value = false;
      }
      if (!extendModeEnabled.value) {
        currentDraggingLine = null;
        dragStartX = null;
        dragStartY = null;
        extendingLine = false;
        extendingPointIndex = null;
      }
    };

    const savePlot = () => {
      const chartOptions = myChart.getOption();
      chartOptions.fitLines = fitLines.map(fitLine => ({
        name: fitLine.name,
        graphic: fitLine.graphic,
      }));
      const blob = new Blob([JSON.stringify(chartOptions)], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName.value}.txt`;
      link.click();
      URL.revokeObjectURL(url);
      showSaveDialog.value = false;
    };

    const loadPlot = () => {
      fileInput.value.click();
    };

    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          const options = JSON.parse(content);
          myChart.setOption(options);
          if (options.fitLines) {
            fitLines.splice(0, fitLines.length, ...options.fitLines);
          }
        };
        reader.readAsText(file);
        showLoadDialog.value = false;
      }
    };

    const handleImportedData = ({ name, data }) => {
      const newSeries = {
        data: data.map(point => [point.x, point.y]),
        type: 'scatter',
        name,
      };
      const currentOptions = myChart.getOption();
      currentOptions.series.push(newSeries);

      const newLegend = [
        ...(currentOptions.legend[0]?.data || []),
        name,
      ];

      myChart.setOption({
        series: currentOptions.series,
        legend: {
          data: newLegend,
        },
      });

      seriesNames.value.push(name);
    };

    const isSeriesNameInUse = (name) => {
      return seriesNames.value.includes(name);
    };

    const openImportDialog = () => {
      showImportDialog.value = true;
    };

    onMounted(() => {
      initChart();
      document.addEventListener('mouseup', onMouseUp);
    });

    onBeforeUnmount(() => {
      if (myChart) {
        myChart.dispose();
      }
      document.removeEventListener('mouseup', onMouseUp);
    });

    return {
      chart,
      showSaveDialog,
      showLoadDialog,
      showModal,
      showImportDialog,
      fileName,
      bestFitLineName,
      confirmBestFitLineName,
      toggleVerticalDragDrop,
      toggleHorizontalDragDrop,
      toggleFreeDragDrop,
      toggleExtendMode,
      savePlot,
      loadPlot,
      handleFileUpload,
      handleImportedData,
      isSeriesNameInUse,
      verticalDragDropEnabled,
      horizontalDragDropEnabled,
      freeDragDropEnabled,
      extendModeEnabled,
      fileInput,
      openImportDialog,
    };
  },
};
</script>

<style scoped>
#chart {
  width: 100%;
  height: 500px;
}

.button-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.button {
  background-color: #bbdefb !important;
}

.button-save {
  background-color: #b2ebf2 !important;
}

.button-load {
  background-color: #b3e5fc !important;
}

.active {
  background-color: #90caf9 !important;
}
</style>
