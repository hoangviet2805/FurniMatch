using System;

namespace FurniMatch.Api.Utils
{
    public static class DistanceHelper
    {
        // Tính khoảng cách giữa 2 toạ độ (Haversine formula) trả về km
        public static double CalculateDistanceInKm(double lat1, double lon1, double lat2, double lon2)
        {
            var R = 6371d; // Bán kính trái đất tính bằng km
            var dLat = Deg2Rad(lat2 - lat1);
            var dLon = Deg2Rad(lon2 - lon1);
            
            var a = 
                Math.Sin(dLat / 2d) * Math.Sin(dLat / 2d) +
                Math.Cos(Deg2Rad(lat1)) * Math.Cos(Deg2Rad(lat2)) * 
                Math.Sin(dLon / 2d) * Math.Sin(dLon / 2d);
                
            var c = 2d * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1d - a));
            var d = R * c; // Distance in km
            
            return d;
        }

        private static double Deg2Rad(double deg)
        {
            return deg * (Math.PI / 180d);
        }
    }
}
