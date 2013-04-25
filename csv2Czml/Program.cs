using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Linq;
using CesiumLanguageWriter;

namespace csv2Czml
{
    public class Program
    {
        const string AssetsDirectory = @"..\..\..\Assets";

        public static void Main(string[] args)
        {
            // use a fixed seed so repeated invocations use the same colors
            var rng = new Random(0);

            var files = new[] 
            {
                @"ISS11_07_image_data.csv",
                @"ISS11_11_image_data.csv",
                @"ISS12_01_image_data.csv",
                @"ISS12_07_2_image_data.csv",
                @"ISS12_11_image_data.csv",
                @"ISS13_01_image_data.csv",
                @"ISS11_04_image_data.csv"
            };

            List<KeyValuePair<string, string>> missions = new List<KeyValuePair<string,string>>();

            foreach (var fileName in files)
            {
                string csvFile = Path.Combine(AssetsDirectory, "CSV", fileName);
                string[] lines = File.ReadAllLines(csvFile);
                
                string czmlFile = Path.Combine(AssetsDirectory, "CZML", Path.ChangeExtension(fileName, ".czml"));
                string jsonFile = Path.Combine(AssetsDirectory, "JSON", Path.ChangeExtension(fileName, ".json"));

                using (StreamWriter czmlWriter = new StreamWriter(czmlFile))
                using (StreamWriter jsonWriter = new StreamWriter(jsonFile))
                using (CesiumOutputStream czmlOutputStream = new CesiumOutputStream(czmlWriter))
                {
                    czmlOutputStream.PrettyFormatting = false;
                    czmlOutputStream.WriteStartSequence();

                    List<string> ID = new List<string>();
                    List<string> Time = new List<string>();
                    List<string> School = new List<string>();
                    List<string> ImageUrl = new List<string>();
                    List<string> LensSize = new List<string>();
                    List<string> OrbitNumber = new List<string>();
                    List<string> FrameWidth = new List<string>();
                    List<string> FrameHeight = new List<string>();
                    List<string> Page = new List<string>();
                    List<string> CZML = new List<string>();

                    GregorianDate start = new GregorianDate();
                    for (int i = 1; i < lines.Length; i++)
                    {
                        string line = lines[i];
                        string[] tokens = line.Split(',');
                        for (int q = 0; q < tokens.Length; q++)
                        {
                            tokens[q] = tokens[q].Trim('"').Trim();
                        }

                        if (i == 1)
                        {
                            start = GregorianDate.Parse(tokens[17]);
                            missions.Add(new KeyValuePair<string, string>(Path.ChangeExtension(fileName, null), tokens[18]));
                        }
                        else if (i == lines.Length - 1)
                        {
                            Console.WriteLine(Path.GetFileNameWithoutExtension(fileName));
                            Console.WriteLine(start.ToJulianDate().TotalDays + " JDate");
                            var stop = GregorianDate.Parse(tokens[17]);
                            Console.WriteLine(stop.ToJulianDate().TotalDays + " JDate");
                            Console.WriteLine();
                            //Console.WriteLine((stop.ToJulianDate() - start.ToJulianDate()).TotalDays);
                        }

                        var writer = new CesiumStreamWriter();
                        using (var packet = writer.OpenPacket(czmlOutputStream))
                        {
                            packet.WriteId(tokens[0]);
                            using (var vertexPositions = packet.OpenVertexPositionsProperty())
                            {
                                var points = new Cartographic[] {
                                    new Cartographic(double.Parse(tokens[5]), double.Parse(tokens[6]), 0),
                                    new Cartographic(double.Parse(tokens[7]), double.Parse(tokens[8]), 0),
                                    new Cartographic(double.Parse(tokens[9]), double.Parse(tokens[10]), 0),
                                    new Cartographic(double.Parse(tokens[11]), double.Parse(tokens[12]), 0)
                                };
                                vertexPositions.WriteCartographicDegrees(points);
                            }
                            using (var polygon = packet.OpenPolygonProperty())
                            {
                                polygon.WriteShowProperty(true);
                                using (var material = polygon.OpenMaterialProperty())
                                {
                                    using (var color = material.OpenSolidColorProperty())
                                    {
                                        color.WriteColorProperty(Color.FromArgb(255, (int)(rng.NextDouble() * 255), (int)(rng.NextDouble() * 255), (int)(rng.NextDouble() * 255)));
                                    }
                                }
                            }
                        }

                        for (int q = 0; q < tokens.Length; q++)
                        {
                            tokens[q] = tokens[q].Replace("\"", "\\\"");
                        }

                        ID.Add(tokens[0]);
                        Time.Add(GregorianDate.Parse(tokens[17]).ToIso8601String(Iso8601Format.Compact));
                        School.Add(tokens[23]);
                        ImageUrl.Add(tokens[21].Split(new[] { '=' })[2]);
                        LensSize.Add(tokens[14]);
                        OrbitNumber.Add(tokens[19]);
                        FrameWidth.Add(tokens[15]);
                        FrameHeight.Add(tokens[16]);
                        Page.Add(tokens[20].Split(new[] { '=' })[1]);
                    }

                    czmlOutputStream.WriteEndSequence();

                    jsonWriter.WriteLine("{");
                    writeJsonArray(jsonWriter, "ID", ID);
                    jsonWriter.WriteLine(",");
                    writeJsonArray(jsonWriter, "Time", Time);
                    jsonWriter.WriteLine(",");
                    writeJsonArray(jsonWriter, "School", School);
                    jsonWriter.WriteLine(",");
                    writeJsonArray(jsonWriter, "ImageUrl", ImageUrl);
                    jsonWriter.WriteLine(",");
                    writeJsonArray(jsonWriter, "LensSize", LensSize);
                    jsonWriter.WriteLine(",");
                    writeJsonArray(jsonWriter, "OrbitNumber", OrbitNumber);
                    jsonWriter.WriteLine(",");
                    writeJsonArray(jsonWriter, "FrameWidth", FrameWidth);
                    jsonWriter.WriteLine(",");
                    writeJsonArray(jsonWriter, "FrameHeight", FrameHeight);
                    jsonWriter.WriteLine(",");
                    writeJsonArray(jsonWriter, "Page", Page);
                    jsonWriter.WriteLine();
                    jsonWriter.WriteLine("}");
                }
            }

            using (StreamWriter missionsJsonWriter = new StreamWriter(Path.Combine(AssetsDirectory, "missions.json")))
            {
                missionsJsonWriter.Write("[");
                for (int i = 0; i < missions.Count; ++i)
                {
                    missionsJsonWriter.Write("{{\"file\":\"{0}\",\"name\":\"{1}\"}}", missions[i].Key, missions[i].Value);
                    if (i != missions.Count - 1)
                        missionsJsonWriter.Write(",");
                }
                missionsJsonWriter.Write("]");
            }
        }

        static void writeJsonArray(TextWriter output, string propertyName, List<string> items)
        {
            output.Write("\"{0}\":[", propertyName);
            for (int i = 0; i < items.Count; i++)
            {
                output.Write("\"{0}\"", items[i]);
                if (i < items.Count - 1)
                    output.Write(",");
            }
            output.Write("]");
        }
    }
}
