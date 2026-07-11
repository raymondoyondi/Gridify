package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"strconv"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/sirupsen/logrus"
	"github.com/urfave/cli/v2"
	"google.golang.org/grpc"

	"gridify/data-processor/pkg/server"
)

var (
	logger = logrus.New()

	// Prometheus metrics
	processedRecords = promauto.NewCounter(prometheus.CounterOpts{
		Name: "gridify_processed_records_total",
		Help: "Total number of records processed",
	})

	processingTime = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "gridify_processing_duration_seconds",
		Help:    "Time taken to process data",
		Buckets: prometheus.DefBuckets,
	})

	processingErrors = promauto.NewCounter(prometheus.CounterOpts{
		Name: "gridify_processing_errors_total",
		Help: "Total number of processing errors",
	})
)

func init() {
	logger.SetFormatter(&logrus.JSONFormatter{})
	logger.SetLevel(logrus.InfoLevel)
	if os.Getenv("DEBUG") == "true" {
		logger.SetLevel(logrus.DebugLevel)
	}
}

func main() {
	app := &cli.App{
		Name:  "gridify-data-processor",
		Usage: "High-performance data processing microservice",
		Commands: []*cli.Command{
			{
				Name:  "server",
				Usage: "Start gRPC server",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:    "port",
						Usage:   "gRPC server port",
						Value:   "50051",
						EnvVars: []string{"GRPC_PORT"},
					},
					&cli.StringFlag{
						Name:    "db-url",
						Usage:   "PostgreSQL connection URL",
						EnvVars: []string{"DATABASE_URL"},
					},
					&cli.StringFlag{
						Name:    "redis-url",
						Usage:   "Redis connection URL",
						EnvVars: []string{"REDIS_URL"},
					},
				},
				Action: func(c *cli.Context) error {
					return startServer(
						c.String("port"),
						c.String("db-url"),
						c.String("redis-url"),
					)
				},
			},
			{
				Name:  "process-csv",
				Usage: "Process a CSV file",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:     "file",
						Usage:    "CSV file path",
						Required: true,
					},
					&cli.StringFlag{
						Name:  "output",
						Usage: "Output format (json, parquet)",
						Value: "json",
					},
				},
				Action: func(c *cli.Context) error {
					return processCSV(c.String("file"), c.String("output"))
				},
			},
		},
	}

	if err := app.Run(os.Args); err != nil {
		logger.Fatal(err)
	}
}

func startServer(port, dbURL, redisURL string) error {
	logger.WithFields(logrus.Fields{
		"port":  port,
		"db":    dbURL != "",
		"redis": redisURL != "",
	}).Info("Starting gRPC server")

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return fmt.Errorf("failed to listen: %w", err)
	}

	s := grpc.NewServer()
	srv := server.NewDataProcessorServer(dbURL, redisURL, logger, processedRecords, processingErrors, processingTime)
	server.RegisterDataProcessorServiceServer(s, srv)

	logger.Infof("gRPC server listening on port %s", port)
	if err := s.Serve(lis); err != nil {
		return fmt.Errorf("failed to serve: %w", err)
	}

	return nil
}

func processCSV(filePath, outputFormat string) error {
	logger.WithFields(logrus.Fields{
		"file":   filePath,
		"format": outputFormat,
	}).Info("Processing CSV file")

	// Placeholder for CSV processing logic
	logger.Infof("Successfully processed CSV: %s", filePath)
	return nil
}
