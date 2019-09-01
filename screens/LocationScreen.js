import React, { Component } from 'react';
import { Platform, Text, TextInput, View, ScrollView, StyleSheet, Button, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import LatLon from 'geodesy/latlon-ellipsoidal-vincenty';
import { ONWATER, MAPKEY } from 'react-native-dotenv'

export default class LocationScreen extends Component {
  state = {
    loading: false,
    numStr: '1',
    locationStr: '',
    initialLoad: true,
    overWater: false,
  };

  componentWillMount() {
    if (Platform.OS === 'android' && !Constants.isDevice) {
      this.setState({
        errorMessage: 'Oops, this will not work on Sketch in an Android emulator. Try it on your device!',
      });
    } else {
      //this._getLocationAsync();
      // Location.watchHeadingAsync((obj) => {
      //   console.log('WATCH:', obj);
      // })
    }
  }

  _getLocationAsync2 = async (distance) => {
    let { status } = await Permissions.askAsync(Permissions.LOCATION);
    if (status !== 'granted') {
      this.setState({
        errorMessage: 'Permission to access location was denied',
      });
      return;
    }
    this.setState({ initialLoad: false, loading: true });
    let location = await Location.getCurrentPositionAsync({});
    let heading = await Location.getHeadingAsync();
    const current = new LatLon(location.coords.latitude, location.coords.longitude);
    const trueLocation = current.destinationPoint(distance * 1000, heading.trueHeading);
    const magLocation = current.destinationPoint(distance * 1000, heading.magHeading);
    console.log('TRUE:', trueLocation);
    console.log('MAG:', magLocation);
    const landWater = await (await fetch(`https://api.onwater.io/api/v1/results/${trueLocation._lat},${trueLocation._lon}?access_token=${ONWATER}`)).json();
    if (landWater.water) {
      this.setState({ overWater: true, loading: false, locationStr: '', errorMessage: 'Over water' });
      return;
    }
    const googleResult = await (await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${landWater.lat},${landWater.lon}&key=${MAPKEY}`)).json();
    if (googleResult.status === 'OK') {
      const addresses = [];
      for (let i = 0; i < googleResult.results.length; i++) {
        console.log('address:', googleResult.results[i].formatted_address);
        addresses.push(googleResult.results[i].formatted_address);
      }
      this.setState({ locationStr: addresses[0], loading: false, overWater: false })
    } else {
      this.setState({ errorMessage: 'Could not find location:' + googleResult.status })
    }
  }

  onRefresh = async () => {
    console.log('REFRESH:', this.state.numStr)
    this._getLocationAsync2(parseInt(this.state.numStr));
  };

  onMileage = (distance) => {
    console.log('MILEAGE:', distance);
    this._getLocationAsync2(distance);
  };

  render() {
    let text = '';
    if (!this.state.loading) {
      if (this.state.errorMessage) {
        text = this.state.errorMessage;
      } else if (this.state.locationStr) {
        text = this.state.locationStr;
      }
    } else {
      if (this.state.initialLoad) {
        text = '';
      } else {
        text = 'Checking...';
      }
    }

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View
          style={styles.inputsView}>
          <TextInput
            style={{ height: 40, width: 100, borderStyle: 'solid', borderWidth: 1 }}
            keyboardType="number-pad"
            placeholder="Distance in KM"
            onChangeText={(numStr) => {
              this.setState({ numStr });
            }}
            value={this.state.numStr}
          />
          <TouchableOpacity onPress={() => this.onRefresh()} style={styles.button}>
            <Text style={styles.button}>Check</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputsView}>
          <TouchableOpacity onPress={this.onMileage.bind(this, 10)} style={styles.button}>
            <Text style={styles.button}>10 km</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={this.onMileage.bind(this, 100)} style={styles.button}>
            <Text style={styles.button}>100 km</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={this.onMileage.bind(this, 1000)} style={styles.button}>
            <Text style={styles.button}>1000 km</Text>
          </TouchableOpacity>
        </View>
        <View>
          <Text style={styles.paragraph}>{text}</Text>
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  inputsView: {
    flexDirection: 'row',
    height: 100,
    padding: 20,
  },
  container: {
    // flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Constants.statusBarHeight,
    backgroundColor: '#ecf0f1',
  },
  paragraph: {
    margin: 24,
    fontSize: 18,
    textAlign: 'center',
  },
  button: {
    textTransform: 'uppercase',
    backgroundColor: 'blue',
    color: 'white',
    margin: 10,
  }
});