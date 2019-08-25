import React, { Component } from 'react';
import { Platform, Text, TextInput, View, ScrollView, StyleSheet, Button, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as Permissions from 'expo-permissions';
import LatLon from 'geodesy/latlon-ellipsoidal-vincenty';

export default class LocationScreen extends Component {
  state = {
    location: null,
    trueLocation: null,
    heading: null,
    errorMessage: null,
    loading: true,
    landWater: null,
    addresses: null,
    magLocation: null,
    text: '1',
  };
  distance = 1;

  componentWillMount() {
    if (Platform.OS === 'android' && !Constants.isDevice) {
      this.setState({
        errorMessage: 'Oops, this will not work on Sketch in an Android emulator. Try it on your device!',
      });
    } else {
      this._getLocationAsync();
      // Location.watchHeadingAsync((obj) => {
      //   console.log('WATCH:', obj);
      // })
    }
  }

  _getLocationAsync2 = async () => {
    let { status } = await Permissions.askAsync(Permissions.LOCATION);
    if (status !== 'granted') {
      this.setState({
        errorMessage: 'Permission to access location was denied',
      });
      return;
    }
    let location = await Location.getCurrentPositionAsync({});
    let heading = await Location.getHeadingAsync();
    const current = new LatLon(location.coords.latitude, location.coords.longitude);
    const trueLocation = current.destinationPoint(this.distance * 1000, heading.trueHeading);
    const magLocation = current.destinationPoint(this.distance * 1000, heading.magHeading);
    console.log('TRUE:', trueLocation);
    console.log('MAG:', magLocation);
  }

  _getLocationAsync = async () => {
    let { status } = await Permissions.askAsync(Permissions.LOCATION);
    if (status !== 'granted') {
      this.setState({
        errorMessage: 'Permission to access location was denied',
      });
      return;
    }
    this.setState({ loading: true });
    let location = await Location.getCurrentPositionAsync({});
    // console.log('LOCATION:', location);
    let heading = await Location.getHeadingAsync();
    console.log('HEADING:', heading);

    const current = new LatLon(location.coords.latitude, location.coords.longitude);
    const trueLocation = current.destinationPoint(this.distance * 1000, heading.trueHeading);
    const magLocation = current.destinationPoint(this.distance * 1000, heading.magHeading);
    console.log('TRUE:', trueLocation);
    console.log('MAG:', magLocation)
    const landWater = await (await fetch(`https://api.onwater.io/api/v1/results/${trueLocation._lat},${trueLocation._lon}?access_token=`)).json();
    console.log('WATER:', landWater.water);

    const addresses = [];
    if (!landWater.water) {
      const googleResult = await (await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${landWater.lat},${landWater.lon}&key=`)).json();
      if (googleResult.status === 'OK') {
        console.log('RESULTS:', googleResult.results.length);
        for (let i = 0; i < googleResult.results.length; i++) {
          console.log('address:', googleResult.results[i].formatted_address);
          addresses.push(googleResult.results[i].formatted_address);
        }
        console.log('GOOGLE:', googleResult.plus_code.compound_code);
      } else {
        console.log('google result:', googleResult.status);
      }
    }
    this.setState({ location, trueLocation, magLocation, heading, loading: false, landWater, addresses });
  };

  onRefresh = async () => {
    console.log('REFRESH:', this.distance);
    this._getLocationAsync();
  };

  onMileage = (distance) => {
    console.log('MILEAGE:', distance);
    this.distance = distance;
    this._getLocationAsync();
  };

  render() {
    let text = 'Waiting...';
    let text2 = '';
    let text3 = '';
    if (!this.state.loading) {
      if (this.state.errorMessage) {
        text = this.state.errorMessage;
      } else if (this.state.location) {
        text = JSON.stringify(this.state.trueLocation);
        text2 = JSON.stringify(this.state.heading);
        text3 = JSON.stringify(this.state.magLocation);
      }
    }

    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.paragraph}>TRUE: {text}</Text>
        <Text style={styles.paragraph}>MAG: {text3}</Text>
        <Text style={styles.paragraph}>HEADING: {text2}</Text>
        {this.state.landWater && <Text style={styles.paragraph}>{this.state.landWater.water ? 'WATER' : 'LAND'}</Text>}
        <Text style={styles.paragraph}>{JSON.stringify(this.state.addresses)}</Text>
        <View
          style={{
            flexDirection: 'row',
            height: 100,
            padding: 20,
          }}>
          <TouchableOpacity onPress={this.onRefresh} style={styles.button}><Text title="Refresh">Refresh</Text></TouchableOpacity>
          <TouchableOpacity onPress={this.onMileage.bind(this, 10)} style={styles.button}><Button title="10" /></TouchableOpacity>
          <TouchableOpacity onPress={this.onMileage.bind(this, 100)} style={styles.button}><Button title="100" /></TouchableOpacity>
          <TouchableOpacity onPress={this.onMileage.bind(this, 1000)} style={styles.button}><Button title="1000" /></TouchableOpacity>
        </View>
        <TextInput
          style={{ height: 40 }}
          keyboardType="number-pad"
          placeholder="Distance"
          onChangeText={(text) => {
            this.setState({ text });
            this.distance = parseInt(text);
          }}
          value={this.state.text}
        />
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
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
    backgroundColor: '#DDDDDD',
    margin: 10,
  }
});