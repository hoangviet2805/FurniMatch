import { useState, useEffect } from 'react';
import axios from 'axios';

export interface Province {
  code: number;
  name: string;
}

export interface District {
  code: number;
  name: string;
  province_code: number;
}

export interface Ward {
  code: number;
  name: string;
  district_code: number;
}

export const useProvinces = () => {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | null>(null);
  const [selectedDistrictCode, setSelectedDistrictCode] = useState<number | null>(null);

  useEffect(() => {
    // Fetch provinces
    axios.get('https://provinces.open-api.vn/api/p/')
      .then(res => setProvinces(res.data))
      .catch(err => console.error("Error fetching provinces", err));
  }, []);

  useEffect(() => {
    if (selectedProvinceCode) {
      // Fetch districts for province
      axios.get(`https://provinces.open-api.vn/api/p/${selectedProvinceCode}?depth=2`)
        .then(res => {
          setDistricts(res.data.districts || []);
          setWards([]);
        })
        .catch(err => console.error("Error fetching districts", err));
    } else {
      setDistricts([]);
      setWards([]);
    }
  }, [selectedProvinceCode]);

  useEffect(() => {
    if (selectedDistrictCode) {
      // Fetch wards for district
      axios.get(`https://provinces.open-api.vn/api/d/${selectedDistrictCode}?depth=2`)
        .then(res => setWards(res.data.wards || []))
        .catch(err => console.error("Error fetching wards", err));
    } else {
      setWards([]);
    }
  }, [selectedDistrictCode]);

  return {
    provinces,
    districts,
    wards,
    selectedProvinceCode,
    setSelectedProvinceCode,
    selectedDistrictCode,
    setSelectedDistrictCode
  };
};
