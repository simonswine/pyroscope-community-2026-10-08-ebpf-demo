package main

import (
	"crypto/sha256"
	"flag"
	"fmt"
	"os"
	"time"
)

var result [32]byte

//go:noinline
func doWork(data []byte) [32]byte {
	return sha256.Sum256(data)
}

//go:noinline
func helloWorld() error {
	_, err := fmt.Fprintln(os.Stdout, "hello world")
	return err
}

func main() {
	iterations := flag.Int("iterations", 0, "number of calls; 0 runs until interrupted")
	pause := flag.Duration("pause", 500*time.Millisecond, "delay between calls")
	flag.Parse()
	if *iterations < 0 || *pause < 0 {
		fmt.Fprintln(os.Stderr, "iterations and pause must be nonnegative")
		os.Exit(1)
	}
	fmt.Println("PID:", os.Getpid())
	data := make([]byte, 1_000_000)
	for i := 0; *iterations == 0 || i < *iterations; i++ {
		result = doWork(data)
		if err := helloWorld(); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		if i % 10 == 9 {
			fmt.Fprintln(os.Stderr, "")
		}
		time.Sleep(*pause)
	}
}
