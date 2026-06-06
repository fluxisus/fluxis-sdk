package fluxis

import (
	"encoding/json"
	"fmt"
	"strconv"
)

// FlexibleFloat unmarshals JSON numbers or numeric strings (the API may return either).
type FlexibleFloat float64

// UnmarshalJSON accepts a JSON number or a numeric string.
func (f *FlexibleFloat) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		return nil
	}

	var number float64
	if err := json.Unmarshal(data, &number); err == nil {
		*f = FlexibleFloat(number)
		return nil
	}

	var text string
	if err := json.Unmarshal(data, &text); err == nil {
		if text == "" {
			return nil
		}
		parsed, err := strconv.ParseFloat(text, 64)
		if err != nil {
			return fmt.Errorf("flexible float: parse %q: %w", text, err)
		}
		*f = FlexibleFloat(parsed)
		return nil
	}

	return fmt.Errorf("flexible float: cannot unmarshal %s", string(data))
}

// Float64 returns the value as float64.
func (f FlexibleFloat) Float64() float64 {
	return float64(f)
}
