# Makefile for Time Tracker

CC = gcc
CFLAGS = -Wall -Wextra -Werror -pedantic
TARGET = time_tracker
SRC = time_tracker.c

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) -o $(TARGET) $(SRC)

clean:
	rm -f $(TARGET)

